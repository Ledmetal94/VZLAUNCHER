import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

declare module 'express' {
  interface Request {
    requestId?: string
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomUUID()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
