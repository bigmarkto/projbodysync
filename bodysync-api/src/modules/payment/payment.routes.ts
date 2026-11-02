import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { db } from '../../config/database'

const router = Router()

router.post('/subscribe', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.userId!
    const rawType = req.body?.subscriptionType
    const subscriptionType = ['free', 'basic', 'premium'].includes(rawType)
      ? rawType
      : 'premium'

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
