import postgres from "npm:postgres@3.4.5";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
}

type SqlInstance = ReturnType<typeof postgres>;

let sqlInstance: SqlInstance | null = null;

function getSql(): SqlInstance {
  if (!sqlInstance) {
    const dbUrl =
      Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL") || "";
    if (!dbUrl) {
      throw new AppError("SUPABASE_DB_URL não configurada no ambiente", 500);
    }

    const isLocal =
      /@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres|supabase_db_[^:/]+)(:|\/|$)/i.test(
        dbUrl,
      );
    const disableSsl = /[?&]sslmode=disable/i.test(dbUrl);

    sqlInstance = postgres(dbUrl, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: isLocal || disableSsl ? false : { rejectUnauthorized: false },
    });
  }
  return sqlInstance;
}

function sanitizeParams(params: unknown[] = []): unknown[] {
  return params.map((v) => (v === undefined ? null : v));
}

export const db = {
  async query<T = Record<string, unknown>>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const sql = getSql();
    // deno-lint-ignore no-explicit-any
    const res: any = await sql.unsafe(text, sanitizeParams(params) as any[]);
    return {
      rows: Array.from(res) as T[],
      rowCount: typeof res.count === "number" ? res.count : res.length,
    };
  },

  async transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> {
    const sql = getSql();
    // deno-lint-ignore no-explicit-any
    return await sql.begin(async (txSql: any) => {
      const tx: Queryable = {
        async query<R = Record<string, unknown>>(
          text: string,
          params: unknown[] = [],
        ): Promise<QueryResult<R>> {
          // deno-lint-ignore no-explicit-any
          const res: any = await txSql.unsafe(
            text,
            sanitizeParams(params) as any[],
          );
          return {
            rows: Array.from(res) as R[],
            rowCount: typeof res.count === "number" ? res.count : res.length,
          };
        },
      };
      return await fn(tx);
    }) as Promise<T>;
  },
};
