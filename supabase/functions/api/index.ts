import { handleAuthRoutes } from "./auth.ts";
import { AppError } from "./db.ts";
import { handleExerciseRoutes } from "./exercise.ts";
import { handleHydrationRoutes } from "./hydration.ts";
import { handleMeasurementRoutes } from "./measurement.ts";
import { handlePaymentRoutes } from "./payment.ts";
import { handleProfileRoutes } from "./profile.ts";
import {
  jsonResponse,
  noContentResponse,
  requireAuth,
} from "./security.ts";
import { handleSessionRoutes } from "./session.ts";
import { handleTrainerRoutes } from "./trainer.ts";
import { handleWorkoutRoutes } from "./workout.ts";

export function normalizePath(rawPathname: string): string {
  let p = rawPathname.replace(/\/+$/, "") || "/";
  if (p.startsWith("/functions/v1/api")) {
    p = p.slice("/functions/v1/api".length) || "/";
  }
  while (p === "/api" || p.startsWith("/api/")) {
    p = p.slice("/api".length) || "/";
  }
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return noContentResponse();
  }

  try {
    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if ((path === "/health" || path === "/") && req.method === "GET") {
      return jsonResponse(
        { status: "ok", timestamp: new Date().toISOString() },
        200,
      );
    }

    if (path.startsWith("/auth/")) {
      const authRes = await handleAuthRoutes(req, path);
      if (authRes) return authRes;
      return jsonResponse({ error: "Rota não encontrada" }, 404);
    }

    const protectedPrefixes = [
      "/profile",
      "/hydration",
      "/exercises",
      "/workouts",
      "/sessions",
      "/measurements",
      "/payment",
      "/trainer",
    ];
    const isProtected = protectedPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
    if (!isProtected) {
      return jsonResponse({ error: "Rota não encontrada" }, 404);
    }

    const auth = await requireAuth(req);

    const res =
      (await handleProfileRoutes(req, path, auth.userId)) ??
      (await handleHydrationRoutes(req, path, auth.userId)) ??
      (await handleExerciseRoutes(req, path, url)) ??
      (await handleWorkoutRoutes(req, path, auth.userId)) ??
      (await handleSessionRoutes(req, path, auth.userId)) ??
      (await handleMeasurementRoutes(req, path, auth.userId)) ??
      (await handlePaymentRoutes(req, path, auth.userId)) ??
      (await handleTrainerRoutes(req, path, auth));

    if (res) return res;
    return jsonResponse({ error: "Rota não encontrada" }, 404);
  } catch (err) {
    if (err instanceof AppError) {
      return jsonResponse({ error: err.message }, err.statusCode);
    }
    console.error("Unhandled Edge Function error:", err);
    return jsonResponse({ error: "Erro interno do servidor" }, 500);
  }
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  Deno.serve(handleRequest);
}
