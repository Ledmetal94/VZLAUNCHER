import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export interface AppError extends Error {
  statusCode?: number
  code?: string
  details?: Array<{ field: string; issue: string }>
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'

  logger.error({ err, statusCode, code }, err.message)

  res.status(statusCode).json({
    error: {
      code,
      message: err.message || 'Internal server error',
      ...(err.details && { details: err.details }),
    },
  })
}

export function createError(
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; issue: string }>,
): AppError {
  const err = new Error(message) as AppError
  err.statusCode = statusCode
  err.code = code
  err.details = details
  return err
}
