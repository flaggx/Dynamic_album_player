import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { errorHandler, CustomError } from '../errorHandler'
import multer from 'multer'

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any
    mockNext = vi.fn()
  })

  describe('CustomError handling', () => {
    it('should handle CustomError with status code', () => {
      const error = new CustomError('Test error', 400)
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Test error' })
    })

    it('should handle CustomError with default status code 500', () => {
      const error = new CustomError('Test error')
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Test error' })
    })
  })

  describe('JWT error handling', () => {
    it('should handle UnauthorizedError', () => {
      const error = new Error('Invalid token')
      error.name = 'UnauthorizedError'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' })
    })
  })

  describe('Validation error handling', () => {
    it('should handle ValidationError', () => {
      const error = new Error('Validation failed')
      error.name = 'ValidationError'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Validation failed' })
    })

    it('should handle ValidationError without message', () => {
      const error = new Error()
      error.name = 'ValidationError'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Validation error' })
    })
  })

  describe('Multer error handling', () => {
    it('should handle MulterError with LIMIT_FILE_SIZE', () => {
      const error = new multer.MulterError('LIMIT_FILE_SIZE')
      error.code = 'LIMIT_FILE_SIZE'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'File too large. Max size is 10MB.' })
    })

    it('should handle MulterError with other codes', () => {
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE')
      error.code = 'LIMIT_UNEXPECTED_FILE'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'File upload error: ' + error.message })
    })

    it('should handle error with "File too large" message', () => {
      const error = new Error('File too large')
      error.name = 'MulterError'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'File too large. Max size is 10MB.' })
    })
  })

  describe('Generic error handling', () => {
    it('should handle generic errors with status code', () => {
      const error: any = new Error('Generic error')
      error.status = 404
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Generic error' })
    })

    it('should handle generic errors with statusCode', () => {
      const error: any = new Error('Generic error')
      error.statusCode = 403
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Generic error' })
    })

    it('should default to 500 for errors without status', () => {
      const error = new Error('Internal error')
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal error' })
    })

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
        stack: 'Error stack trace',
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
      })

      process.env.NODE_ENV = originalEnv
    })
  })
})

