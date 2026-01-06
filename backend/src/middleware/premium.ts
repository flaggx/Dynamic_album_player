import { Request, Response, NextFunction } from 'express'
import { db } from '../database/init.js'
import { promisify } from 'util'
import { getUserId, getUserRoles, AuthRequest } from './auth.js'
import { CustomError } from './errorHandler'

const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>

/**
 * Check if user is admin
 */
const isAdmin = (req: AuthRequest): boolean => {
  const roles = getUserRoles(req)
  return Array.isArray(roles) && roles.some(role => 
    role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrator'
  )
}

/**
 * Middleware to check if user has premium subscription or is admin
 * Returns 403 if user is not premium and not admin
 */
export const requirePremium = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if user is admin - admins get premium access
    if (isAdmin(req)) {
      return next()
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    const isPremium = user.subscription_status === 'active' && user.subscription_tier === 'premium'
    
    if (!isPremium) {
      throw new CustomError('Premium subscription required. Upgrade to premium to upload songs and albums.', 403)
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Helper function to check if user is premium or admin (non-middleware)
 */
export const isPremiumUser = async (userId: string, req?: AuthRequest): Promise<boolean> => {
  try {
    // Check if user is admin - admins get premium access
    if (req && isAdmin(req)) {
      return true
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      return false
    }
    return user.subscription_status === 'active' && user.subscription_tier === 'premium'
  } catch (error) {
    console.error('Error checking premium status:', error)
    return false
  }
}

