import { Router } from 'express'

const router = Router()

// Placeholder: simula ativação de assinatura sem cobrar nada
router.post('/subscribe', (req, res) => {
  // Aqui no futuro entrará a integração com Stripe/MercadoPago
  res.status(200).json({
    success: true,
    message: 'Pagamento simulado com sucesso. Assinatura ativada.',
    data: { subscription: 'premium', status: 'active' },
  })
})

export { router as paymentRoutes }
