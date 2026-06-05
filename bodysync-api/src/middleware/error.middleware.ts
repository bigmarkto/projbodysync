import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
  }
}

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // obrigatório mesmo sem usar — Express identifica handler de erro pela aridade de 4
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
