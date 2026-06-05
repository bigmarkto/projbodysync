import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

// Estende a interface Request do Express para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Extrai o header Authorization
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  // O header vem como "Bearer eyJhbG..."
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res
      .status(401)
      .json({ error: 'Formato de token inválido. Use: Bearer <token>' })
  }

  try {
    // Valida o token e extrai o payload
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string
      email: string
    }

    // Anexa o userId no request para os controllers usarem
    req.userId = decoded.userId

    // Segue para o próximo middleware ou controller
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}
