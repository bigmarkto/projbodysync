import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { db } from '../config/database'

// Estende a interface Request do Express para incluir userId e userRole
declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
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
      role?: string
    }

    // Anexa userId e role no request para os controllers e guards usarem
    req.userId = decoded.userId
    req.userRole = decoded.role

    // Segue para o próximo middleware ou controller
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export async function requireProfessor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  let role = req.userRole
  if (!role) {
    try {
      const r = await db.query(
        'SELECT role FROM users WHERE id = $1 LIMIT 1',
        [req.userId]
      )
      role = r.rows[0]?.role
    } catch {
      return res.status(500).json({ error: 'Erro ao validar permissões' })
    }
  }

  if (role !== 'professor' && role !== 'admin') {
    return res
      .status(403)
      .json({ error: 'Acesso restrito a contas de Personal Trainer' })
  }

  next()
}
