import { db } from "./db.ts";
import { jsonResponse, parseJsonBody } from "./security.ts";

function isSubscriptionAllowedForRole(
  role: string,
  subscriptionType: unknown,
): subscriptionType is "free" | "basic" | "premium" {
  const allowedByRole = role === "professor"
    ? ["free", "basic"]
    : ["free", "premium"];
  return typeof subscriptionType === "string" &&
    allowedByRole.includes(subscriptionType);
}

export async function handlePaymentRoutes(
  req: Request,
  path: string,
  userId: string,
): Promise<Response | null> {
  if (path === "/payment/subscribe" && req.method === "POST") {
    const body = await parseJsonBody(req);
    const rawType = body.subscriptionType;

    const userRes = await db.query<{ role: string }>(
      "SELECT role FROM users WHERE id = $1 LIMIT 1",
      [userId],
    );
    const role = userRes.rows[0]?.role ?? "comum";

    if (!isSubscriptionAllowedForRole(role, rawType)) {
      return jsonResponse({ error: "Plano inválido para este perfil." }, 400);
    }

    const subscriptionType = rawType;

    await db.query(
      "UPDATE user_profiles SET subscription_type = $1, updated_at = NOW() WHERE user_id = $2",
      [subscriptionType, userId],
    );
    await db.query(
      "UPDATE users SET subscription_type = $1 WHERE id = $2",
      [subscriptionType, userId],
    );

    return jsonResponse(
      {
        success: true,
        message: "Assinatura simulada ativada com sucesso.",
        data: { subscription: subscriptionType, status: "active" },
      },
      200,
    );
  }

  return null;
}
