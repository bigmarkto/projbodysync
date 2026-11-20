import bcryptPkg from "npm:bcryptjs@2.4.3";
import { jwtVerify, SignJWT } from "npm:jose@5.9.6";
import { AppError, db } from "./db.ts";

// deno-lint-ignore no-explicit-any
const bcrypt: any =
  (bcryptPkg as unknown as { default?: unknown }).default ?? bcryptPkg;

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function noContentResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  role?: string;
}

function getJwtSecretBytes(): Uint8Array {
  const secret =
    Deno.env.get("JWT_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) {
    throw new AppError("Segredo JWT não configurado no ambiente", 500);
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomInt(maxExclusive: number): number {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let val = 0;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % maxExclusive;
}

export async function signJwt(
  payload: JwtPayload,
  expiresIn: string,
): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretBytes());
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecretBytes(), {
    algorithms: ["HS256"],
  });
  return {
    userId: String(payload.userId ?? ""),
    email: String(payload.email ?? ""),
    role: payload.role ? String(payload.role) : "comum",
  };
}

export async function requireAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new AppError("Token não fornecido", 401);
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError(
      "Formato de token inválido. Use: Bearer <token>",
      401,
    );
  }

  try {
    const decoded = await verifyJwt(token);
    if (!decoded.userId) {
      throw new AppError("Token inválido ou expirado", 401);
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Token inválido ou expirado", 401);
  }
}

export async function requireProfessor(auth: AuthContext): Promise<void> {
  if (!auth.userId) {
    throw new AppError("Não autenticado", 401);
  }

  let role = auth.role;
  if (!role) {
    try {
      const r = await db.query<{ role: string }>(
        "SELECT role FROM users WHERE id = $1 LIMIT 1",
        [auth.userId],
      );
      role = r.rows[0]?.role;
    } catch {
      throw new AppError("Erro ao validar permissões", 500);
    }
  }

  if (role !== "professor" && role !== "admin") {
    throw new AppError("Acesso restrito a contas de Personal Trainer", 403);
  }
}

export function parseJsonColumn<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

// Chave YYYY-MM-DD no fuso America/Sao_Paulo (independente do fuso do servidor)
export function dateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isValidIsoDate(raw: unknown): raw is string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }
  const [y, m, d] = raw.split("-").map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  const check = new Date(Date.UTC(y, m - 1, d));
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

export async function parseJsonBody(
  req: Request,
): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    throw new AppError("JSON inválido", 400);
  }
}
