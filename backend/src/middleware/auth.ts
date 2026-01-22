import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as jose from 'jose'
import { dbGet } from '../database/client.js'

export interface AuthRequest extends Request {
  auth?: SupabaseJwtPayload
}

export interface SupabaseJwtPayload {
  sub: string
  email?: string
  role?: string
  aud?: string | string[]
  iss?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '')

const expectedIssuer = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : ''

if (!SUPABASE_JWT_SECRET && SUPABASE_URL) {
  console.log('ℹ️  JWT verification: using Supabase JWKS (asymmetric signing). SUPABASE_JWT_SECRET not set.')
} else if (!SUPABASE_JWT_SECRET && !SUPABASE_URL) {
  console.warn('⚠️  Set SUPABASE_URL (JWKS) or SUPABASE_JWT_SECRET (HS256). Authentication will fail.')
}

async function verifyBearerToken(token: string): Promise<SupabaseJwtPayload> {
  if (SUPABASE_JWT_SECRET) {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
      audience: 'authenticated',
      ...(expectedIssuer ? { issuer: expectedIssuer } : {}),
    }) as SupabaseJwtPayload
    return decoded
  }

  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required when SUPABASE_JWT_SECRET is not set')
  }

  const jwks = jose.createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  const { payload } = await jose.jwtVerify(token, jwks, {
    issuer: expectedIssuer,
    audience: 'authenticated',
  })
  return payload as SupabaseJwtPayload
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  void (async () => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const token = header.slice(7).trim()
    try {
      req.auth = await verifyBearerToken(token)
      next()
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
    }
  })()
}

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  void (async () => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      next()
      return
    }
    const token = header.slice(7).trim()
    try {
      req.auth = await verifyBearerToken(token)
    } catch {
      req.auth = undefined
    }
    next()
  })()
}

export const getUserId = (req: AuthRequest): string | null => {
  return req.auth?.sub || null
}

export const isAuthenticated = (req: AuthRequest): boolean => {
  return !!req.auth?.sub
}

export const getUserRoles = (req: AuthRequest): string[] => {
  const meta = req.auth?.app_metadata
  if (!meta) return []

  const direct = meta.roles
  if (Array.isArray(direct)) {
    return direct.filter((r): r is string => typeof r === 'string')
  }
  const role = meta.role
  if (typeof role === 'string' && role.length > 0) {
    return [role]
  }
  return []
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      if (!isAuthenticated(req)) {
        res.status(401).json({ error: 'Authentication required' })
        return
      }

      const userId = getUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' })
        return
      }

      const roles = getUserRoles(req)
      const jwtAdmin = roles.some(
        (r) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator'
      )
      if (jwtAdmin) {
        next()
        return
      }

      const row = await dbGet('SELECT is_admin FROM users WHERE id = ?', [userId])
      if (row?.is_admin === true) {
        next()
        return
      }

      res.status(403).json({ error: 'Admin access required' })
    } catch (e) {
      next(e)
    }
  })()
}

export const checkBanned = async (
  userId: string,
  dbGet: (sql: string, params?: unknown[]) => Promise<Record<string, unknown> | undefined>
): Promise<boolean> => {
  const user = await dbGet('SELECT banned FROM users WHERE id = ?', [userId])
  return user?.banned === true
}
