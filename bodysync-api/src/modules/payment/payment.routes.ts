import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { db } from '../../config/database'

const router = Router()

export function isSubscriptionAllowedForRole(
  role: string,
  subscriptionType: unknown
): subscriptionType is 'free' | 'basic' | 'premium' {
  const allowedByRole =
    role === 'professor' ? ['free', 'basic'] : ['free', 'premium']
  return typeof subscriptionType === 'string' && allowedByRole.includes(subscriptionType)
}

router.post('/subscribe', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!
    const rawType = req.body?.subscriptionType

    const userRes = await db.query(
      'SELECT role FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    const role: string = userRes.rows[0]?.role ?? 'comum'

    if (!isSubscriptionAllowedForRole(role, rawType)) {
      return res.status(400).json({
        error: 'Plano inválido para este perfil.',
      })
    }

    const subscriptionType = rawType

    await db.query(
      'UPDATE user_profiles SET subscription_type = $1, updated_at = NOW() WHERE user_id = $2',
      [subscriptionType, userId]
    )
    await db.query(
      'UPDATE users SET subscription_type = $1 WHERE id = $2',
      [subscriptionType, userId]
    )

    res.status(200).json({
      success: true,
      message: 'Assinatura simulada ativada com sucesso.',
      data: { subscription: subscriptionType, status: 'active' },
    })
  } catch (err) {
    next(err)
  }
})

export { router as paymentRoutes }
