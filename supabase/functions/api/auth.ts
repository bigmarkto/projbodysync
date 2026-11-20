import { AppError, db } from "./db.ts";
import {
  comparePassword,
  hashPassword,
  type JwtPayload,
  jsonResponse,
  noContentResponse,
  parseJsonBody,
  parseJsonColumn,
  randomHex,
  sha256Hex,
  signJwt,
  verifyJwt,
} from "./security.ts";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// deno-lint-ignore no-explicit-any
function mapDbRowToUser(userDb: any) {
  return {
    id: userDb.id,
    email: userDb.email,
    name: userDb.name,
    heightCm: Number(userDb.height_cm),
    birthDate: userDb.birth_date,
    weightKg: Number(userDb.weight_kg),
    gender: userDb.gender,
    fitnessGoal: userDb.fitness_goal,
    role: userDb.role,
    experienceLevel: userDb.experience_level ?? null,
    activityLevel: userDb.activity_level,
    workoutFrequency: userDb.workout_frequency ?? null,
    lastWorkoutDate: userDb.last_workout_date ?? null,
    subscriptionType: userDb.subscription_type,
    desiredWeightKg: userDb.desired_weight_kg
      ? Number(userDb.desired_weight_kg)
      : null,
    hydrationReminder: Boolean(userDb.hydration_reminder),
    desiredModality: userDb.desired_modality ?? null,
    workoutSchedule: parseJsonColumn(userDb.workout_schedule),
  };
}

async function generateTokens(user: {
  id: string;
  email: string;
  role: string;
}) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const [accessToken, refreshToken] = await Promise.all([
    signJwt(payload, ACCESS_TOKEN_EXPIRES_IN),
    signJwt(payload, REFRESH_TOKEN_EXPIRES_IN),
  ]);
  return { accessToken, refreshToken };
}

const USER_WITH_PROFILE_SELECT = `
  SELECT
    u.id,
    u.email,
    u.name,
    u.password_hash,
    COALESCE(up.height_cm, u.height_cm) AS height_cm,
    COALESCE(up.birth_date, u.birth_date) AS birth_date,
    COALESCE(up.weight_kg, u.weight_kg) AS weight_kg,
    COALESCE(up.gender, u.gender) AS gender,
    COALESCE(up.fitness_goal, u.fitness_goal) AS fitness_goal,
    COALESCE(up.role, u.role) AS role,
    COALESCE(up.experience_level, u.experience_level) AS experience_level,
    COALESCE(up.activity_level, u.activity_level) AS activity_level,
    COALESCE(up.workout_frequency, u.workout_frequency) AS workout_frequency,
    COALESCE(up.last_workout_date, u.last_workout_date) AS last_workout_date,
    COALESCE(up.subscription_type, u.subscription_type) AS subscription_type,
    COALESCE(up.desired_weight_kg, u.desired_weight_kg) AS desired_weight_kg,
    COALESCE(up.hydration_reminder, u.hydration_reminder) AS hydration_reminder,
    COALESCE(up.desired_modality, u.desired_modality) AS desired_modality,
    COALESCE(up.workout_schedule, u.workout_schedule) AS workout_schedule
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
`;

export async function handleAuthRoutes(
  req: Request,
  path: string,
): Promise<Response | null> {
  if (req.method !== "POST") return null;

  if (path === "/auth/register") {
    const body = await parseJsonBody(req);
    const {
      email,
      password,
      confirmPassword,
      name,
      birthYear,
      birthDate,
      heightCm,
      weightKg,
      desiredWeightKg,
      gender,
      fitnessGoal,
      experienceLevel,
      activityLevel,
      role,
      hydrationReminder,
      desiredModality,
      modalities,
      workoutSchedule,
      workoutDays,
      workoutTime,
    } = body;

    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return jsonResponse(
        { error: "Formato de email inválido. Exemplo: usuario@email.com" },
        400,
      );
    }

    if (!password || typeof password !== "string") {
      return jsonResponse({ error: "Senha é obrigatória" }, 400);
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "A senha deve ter no mínimo 8 caracteres" },
        400,
      );
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return jsonResponse(
        {
          error:
            "A senha deve conter pelo menos uma letra maiúscula e um número",
        },
        400,
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return jsonResponse({ error: "As senhas não coincidem" }, 400);
    }

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return jsonResponse(
        { error: "Nome deve ter pelo menos 3 caracteres" },
        400,
      );
    }

    const dateValue = birthYear || birthDate;
    if (!dateValue) {
      return jsonResponse(
        {
          error:
            "Data de nascimento é obrigatória. Envie birthYear ou birthDate.",
        },
        400,
      );
    }

    const dateStr = String(dateValue);
    const finalBirthDate = dateStr.includes("-")
      ? dateStr
      : `${dateStr}-01-01`;

    if (!heightCm || isNaN(Number(heightCm)) || Number(heightCm) <= 0) {
      return jsonResponse(
        { error: "Altura deve ser um número válido em centímetros" },
        400,
      );
    }

    if (!weightKg || isNaN(Number(weightKg)) || Number(weightKg) <= 0) {
      return jsonResponse(
        { error: "Peso deve ser um número válido em quilogramas" },
        400,
      );
    }

    if (
      !gender ||
      typeof gender !== "string" ||
      !["masculino", "feminino", "outro", "nao_binario"].includes(gender)
    ) {
      return jsonResponse(
        {
          error:
            "Gênero inválido. Use: masculino | feminino | outro | nao_binario",
        },
        400,
      );
    }

    const validFitnessGoals = [
      "emagrecimento",
      "ganho_peso",
      "ganho_massa_muscular",
      "condicionamento_fisico",
      "saude_bem_estar",
    ];
    const validExperienceLevels = ["iniciante", "intermediario", "avancado"];

    let finalFitnessGoal =
      typeof fitnessGoal === "string" ? fitnessGoal : undefined;
    let finalExperienceLevel =
      typeof experienceLevel === "string" ? experienceLevel : undefined;

    if (finalFitnessGoal && validExperienceLevels.includes(finalFitnessGoal)) {
      finalExperienceLevel = finalFitnessGoal;
      finalFitnessGoal = "condicionamento_fisico";
    }

    if (!finalFitnessGoal || !validFitnessGoals.includes(finalFitnessGoal)) {
      finalFitnessGoal = "condicionamento_fisico";
    }

    const finalActivityLevel =
      typeof activityLevel === "string" && activityLevel
        ? activityLevel
        : "moderado";

    const finalRole = typeof role === "string" && role ? role : "comum";
    if (!["comum", "professor"].includes(finalRole)) {
      return jsonResponse(
        {
          error:
            "Tipo de usuário inválido para cadastro público. Use: comum | professor",
        },
        403,
      );
    }

    const finalSubscriptionType = "free";
    const finalDesiredWeightKg = desiredWeightKg
      ? Number(desiredWeightKg)
      : null;
    const finalHydrationReminder = Boolean(hydrationReminder ?? false);

    let finalDesiredModality =
      typeof desiredModality === "string" && desiredModality
        ? desiredModality
        : null;
    if (Array.isArray(modalities)) {
      finalDesiredModality =
        modalities.length > 0 ? String(modalities[0]) : null;
    }

    let finalWorkoutSchedule: { days: boolean[]; time: string | null } | null =
      null;
    if (workoutSchedule && typeof workoutSchedule === "object") {
      finalWorkoutSchedule = workoutSchedule as {
        days: boolean[];
        time: string | null;
      };
    } else if (workoutDays || workoutTime) {
      if (!Array.isArray(workoutDays)) {
        return jsonResponse(
          { error: "workoutDays deve ser um array de números (0-6)" },
          400,
        );
      }
      const daysArray = new Array(7).fill(false);
      for (const dayIndex of workoutDays) {
        if (typeof dayIndex === "number" && dayIndex >= 0 && dayIndex <= 6) {
          daysArray[dayIndex] = true;
        }
      }
      finalWorkoutSchedule = {
        days: daysArray,
        time: typeof workoutTime === "string" && workoutTime ? workoutTime : null,
      };
    }

    const workoutFrequency = finalWorkoutSchedule &&
        Array.isArray(finalWorkoutSchedule.days)
      ? finalWorkoutSchedule.days.filter(Boolean).length
      : null;

    try {
      const existingUser = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );
      if (existingUser.rows.length > 0) {
        return jsonResponse({ error: "Este email já está cadastrado" }, 409);
      }

      const passwordHash = await hashPassword(password);

      const result = await db.transaction(async (tx) => {
        const userResult = await tx.query(
          `INSERT INTO users (
            email, password_hash, name, height_cm, birth_date,
            weight_kg, gender, fitness_goal, role, experience_level, activity_level,
            workout_frequency, last_workout_date,
            subscription_type, desired_weight_kg, hydration_reminder,
            desired_modality, workout_schedule
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          RETURNING id, email, name, height_cm, birth_date, weight_kg, gender, fitness_goal,
                    role, experience_level, activity_level, workout_frequency, last_workout_date,
                    subscription_type, desired_weight_kg, hydration_reminder,
                    desired_modality, workout_schedule`,
          [
            email,
            passwordHash,
            name.trim(),
            Number(heightCm),
            finalBirthDate,
            Number(weightKg),
            gender,
            finalFitnessGoal,
            finalRole,
            finalExperienceLevel || null,
            finalActivityLevel,
            workoutFrequency,
            null,
            finalSubscriptionType,
            finalDesiredWeightKg,
            finalHydrationReminder,
            finalDesiredModality,
            finalWorkoutSchedule
              ? JSON.stringify(finalWorkoutSchedule)
              : null,
          ],
        );

        const user = mapDbRowToUser(userResult.rows[0]);

        await tx.query(
          `INSERT INTO user_profiles (
            user_id, weight_kg, height_cm, birth_date, gender,
            fitness_goal, role, experience_level, activity_level,
            workout_frequency, last_workout_date,
            subscription_type, desired_weight_kg, hydration_reminder,
            desired_modality, workout_schedule
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            user.id,
            Number(weightKg),
            Number(heightCm),
            finalBirthDate,
            gender,
            finalFitnessGoal,
            finalRole,
            finalExperienceLevel || null,
            finalActivityLevel,
            workoutFrequency,
            null,
            finalSubscriptionType,
            finalDesiredWeightKg,
            finalHydrationReminder,
            finalDesiredModality,
            finalWorkoutSchedule
              ? JSON.stringify(finalWorkoutSchedule)
              : null,
          ],
        );

        const tokens = await generateTokens(user);
        const refreshTokenHash = await hashPassword(tokens.refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await tx.query(
          `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [user.id, refreshTokenHash, expiresAt.toISOString()],
        );

        return { user, ...tokens };
      });

      return jsonResponse(
        {
          message: "Usuário cadastrado com sucesso!",
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        201,
      );
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      const pgCode = (error as any)?.code;
      if (pgCode === "23505") {
        return jsonResponse({ error: "Este email já está cadastrado" }, 409);
      }
      console.error("Erro no registro:", error);
      return jsonResponse(
        { error: "Erro interno ao cadastrar usuário. Tente novamente." },
        500,
      );
    }
  }

  if (path === "/auth/login") {
    const body = await parseJsonBody(req);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonResponse({ error: "Email e senha são obrigatórios" }, 400);
    }

    const result = await db.query(
      `${USER_WITH_PROFILE_SELECT} WHERE u.email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return jsonResponse({ error: "Email ou senha inválidos" }, 401);
    }

    const userDb = result.rows[0];
    const isPasswordValid = await comparePassword(
      password,
      String(userDb.password_hash),
    );
    if (!isPasswordValid) {
      return jsonResponse({ error: "Email ou senha inválidos" }, 401);
    }

    const user = mapDbRowToUser(userDb);
    const tokens = await generateTokens(user);
    const refreshTokenHash = await hashPassword(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, expiresAt.toISOString()],
    );

    return jsonResponse(
      {
        message: "Login realizado com sucesso!",
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      200,
    );
  }

  if (path === "/auth/refresh") {
    const body = await parseJsonBody(req);
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken : "";

    if (!refreshToken) {
      return jsonResponse({ error: "Refresh token é obrigatório" }, 400);
    }

    let payload: JwtPayload;
    try {
      payload = await verifyJwt(refreshToken);
    } catch {
      throw new AppError("Refresh token inválido ou expirado", 401);
    }

    const result = await db.query<{
      id: string;
      user_id: string;
      token_hash: string;
    }>(
      `SELECT id, user_id, token_hash, expires_at FROM refresh_tokens
       WHERE user_id = $1 AND expires_at > NOW()`,
      [payload.userId],
    );

    if (result.rows.length === 0) {
      throw new AppError("Refresh token não encontrado ou expirado", 401);
    }

    let validTokenRecord: {
      id: string;
      user_id: string;
      token_hash: string;
    } | null = null;
    for (const record of result.rows) {
      const isValid = await comparePassword(refreshToken, record.token_hash);
      if (isValid) {
        validTokenRecord = record;
        break;
      }
    }

    if (!validTokenRecord) {
      throw new AppError("Refresh token inválido", 401);
    }

    const userResult = await db.query(
      `${USER_WITH_PROFILE_SELECT} WHERE u.id = $1`,
      [validTokenRecord.user_id],
    );
    if (userResult.rows.length === 0) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const user = mapDbRowToUser(userResult.rows[0]);
    const newTokens = await generateTokens(user);
    const newTokenHash = await hashPassword(newTokens.refreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
      await tx.query("DELETE FROM refresh_tokens WHERE id = $1", [
        validTokenRecord.id,
      ]);
      await tx.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, newTokenHash, newExpiresAt.toISOString()],
      );
    });

    return jsonResponse(newTokens, 200);
  }

  if (path === "/auth/logout") {
    const body = await parseJsonBody(req);
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken : "";

    if (!refreshToken) {
      return jsonResponse({ error: "Refresh token é obrigatório" }, 400);
    }

    let payload: JwtPayload;
    try {
      payload = await verifyJwt(refreshToken);
    } catch {
      throw new AppError("Refresh token inválido", 401);
    }

    const result = await db.query(
      "DELETE FROM refresh_tokens WHERE user_id = $1",
      [payload.userId],
    );

    if (result.rowCount === 0) {
      throw new AppError("Nenhum token ativo encontrado", 500);
    }

    return noContentResponse();
  }

  if (path === "/auth/forgot-password") {
    const body = await parseJsonBody(req);
    const email = typeof body.email === "string" ? body.email : "";

    if (!email || !emailRegex.test(email)) {
      return jsonResponse({ error: "Formato de email inválido" }, 400);
    }

    const result = await db.query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].id;
      const token = randomHex(32);
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt.toISOString()],
      );
    }

    return jsonResponse(
      {
        message:
          "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação em instantes.",
      },
      200,
    );
  }

  if (path === "/auth/reset-password") {
    const body = await parseJsonBody(req);
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== "string") {
      return jsonResponse(
        { error: "Token de recuperação é obrigatório" },
        400,
      );
    }

    if (!password || typeof password !== "string") {
      return jsonResponse({ error: "Senha é obrigatória" }, 400);
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: "A senha deve ter no mínimo 8 caracteres" },
        400,
      );
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return jsonResponse(
        {
          error:
            "A senha deve conter pelo menos uma letra maiúscula e um número",
        },
        400,
      );
    }

    if (password !== confirmPassword) {
      return jsonResponse({ error: "As senhas não coincidem" }, 400);
    }

    const tokenHash = await sha256Hex(token);
    const result = await db.query<{
      id: number;
      user_id: string;
      expires_at: string | Date;
      used: boolean;
    }>(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens
       WHERE token = $1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      return jsonResponse({ error: "Token inválido ou expirado" }, 400);
    }

    const tokenRecord = result.rows[0];
    if (tokenRecord.used || new Date(tokenRecord.expires_at) < new Date()) {
      return jsonResponse({ error: "Token inválido ou expirado" }, 400);
    }

    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      await tx.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        passwordHash,
        tokenRecord.user_id,
      ]);
      await tx.query(
        "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
        [tokenRecord.id],
      );
    });

    return jsonResponse(
      {
        message: "Senha redefinida com sucesso! Faça login com a nova senha.",
      },
      200,
    );
  }

  return null;
}
