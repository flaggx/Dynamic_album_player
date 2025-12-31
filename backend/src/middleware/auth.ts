import { expressjwt, GetVerificationKey } from 'express-jwt'
import { expressJwtSecret } from 'jwks-rsa'
import { Request } from 'express'

// Extend Express Request to include auth property
export interface AuthRequest extends Request {
  auth?: {
    sub: string
    email?: string
    name?: string
    picture?: string
  }
}

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || ''
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || ''

if (!AUTH0_DOMAIN) {
  console.warn('⚠️  AUTH0_DOMAIN not set. Authentication will be disabled.')
}

// JWT verification middleware
export const authenticate = expressjwt({
  secret: expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as GetVerificationKey,
  audience: AUTH0_AUDIENCE || undefined,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  requestProperty: 'auth',
})

// Optional authentication - doesn't fail if no token
export const optionalAuth = expressjwt({
  secret: expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as GetVerificationKey,
  audience: AUTH0_AUDIENCE || undefined,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  requestProperty: 'auth',
  credentialsRequired: false,
})

// Helper to get user ID from request
export const getUserId = (req: AuthRequest): string | null => {
  return req.auth?.sub || null
}

// Helper to check if user is authenticated
export const isAuthenticated = (req: AuthRequest): boolean => {
  return !!req.auth?.sub
}

