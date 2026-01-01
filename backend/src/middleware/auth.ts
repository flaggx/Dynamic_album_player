import { expressjwt, GetVerificationKey } from 'express-jwt'
import { expressJwtSecret } from 'jwks-rsa'
import { Request, Response, NextFunction } from 'express'

// Extend Express Request to include auth property
export interface AuthRequest extends Request {
  auth?: {
    sub: string
    email?: string
    name?: string
    picture?: string
    // Auth0 roles are in the token's permissions or roles claim
    // Check both common locations
    'https://lostcampstudios.com/roles'?: string[]
    roles?: string[]
    permissions?: string[]
  }
}

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || ''
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || ''

if (!AUTH0_DOMAIN) {
  console.warn('⚠️  AUTH0_DOMAIN not set. Authentication will be disabled.')
}

console.log('Auth0 config - Domain:', AUTH0_DOMAIN ? 'set' : 'NOT SET', 'Audience:', AUTH0_AUDIENCE ? 'set' : 'NOT SET')

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

// Helper to get user roles from Auth0 token
export const getUserRoles = (req: AuthRequest): string[] => {
  const auth = req.auth
  if (!auth) return []
  
  // Auth0 roles can be in different places depending on configuration
  // Check common locations
  return (
    auth['https://lostcampstudios.com/roles'] ||
    auth.roles ||
    auth.permissions ||
    []
  )
}

// Middleware to check if user has admin role
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const roles = getUserRoles(req)
  const isAdmin = roles.includes('admin') || roles.includes('Admin')

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

// Helper to check if user is banned (requires database query)
// This should be used in routes that need to check ban status
// Usage: const isBanned = await checkBanned(userId, dbGet)
export const checkBanned = async (
  userId: string, 
  dbGet: (sql: string, params?: any[]) => Promise<any>
): Promise<boolean> => {
  const user = await dbGet('SELECT banned FROM users WHERE id = ?', [userId])
  return user?.banned === 1
}

