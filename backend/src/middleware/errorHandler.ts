import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

export class CustomError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
  }
}

export interface ApiError extends Error {
  status?: number
  statusCode?: number
}

export const errorHandler = (
  err: ApiError | CustomError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Custom errors
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // JWT errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message || 'Validation error' })
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError' || err instanceof multer.MulterError) {
    if ((err as any).code === 'LIMIT_FILE_SIZE' || err.message.includes('File too large')) {
      return res.status(400).json({ error: 'File too large. Max size is 10MB.' })
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message })
  }

  // Errors from fileFilter (multer fileFilter can throw regular Errors)
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message })
  }

  // SQLite database locked errors
  if ((err as any).code === 'SQLITE_BUSY' || err.message?.includes('database is locked')) {
    return res.status(503).json({ error: 'Database is temporarily busy. Please try again.' })
  }

  // Custom API errors
  const status = (err as ApiError).status || (err as ApiError).statusCode || 500
  const message = err.message || 'Internal server error'

  console.error('Error:', err)

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler

