import express from 'express'
import Stripe from 'stripe'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { authenticate, getUserId, getUserRoles, AuthRequest } from '../middleware/auth.js'
import { CustomError } from '../middleware/errorHandler'

const router = express.Router()
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY not set - premium features will not work')
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
}) : null

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || ''

// Get subscription status for current user
router.get('/status', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Check if user is admin - admins get premium access
    const roles = getUserRoles(req)
    const isAdminUser = Array.isArray(roles) && roles.some(role => 
      role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrator'
    )

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      // User doesn't exist in database yet - return status based on admin role
      return res.json({
        isPremium: isAdminUser,
        subscriptionStatus: isAdminUser ? 'active' : 'free',
        subscriptionTier: isAdminUser ? 'premium' : 'free',
        subscriptionEndsAt: null,
        stripeCustomerId: null,
      })
    }

    // Admins are treated as premium users
    const isPremium = isAdminUser || (user.subscription_status === 'active' && user.subscription_tier === 'premium')
    const subscriptionEndsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at).toISOString() : null

    res.json({
      isPremium,
      subscriptionStatus: isAdminUser ? 'active' : (user.subscription_status || 'free'),
      subscriptionTier: isAdminUser ? 'premium' : (user.subscription_tier || 'free'),
      subscriptionEndsAt,
      stripeCustomerId: user.stripe_customer_id || null,
    })
  } catch (error) {
    console.error('Error in /status route:', error)
    next(error)
  }
})

// Create checkout session
router.post('/create-checkout-session', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) {
      throw new CustomError('Stripe is not configured', 500)
    }

    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    // Get or create Stripe customer
    let user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) {
      throw new CustomError('User not found', 404)
    }

    let customerId = user.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await dbRun(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
        [customerId, userId]
      )
    }

    // Get returnTo from request body if provided
    const returnTo = req.body.returnTo || ''
    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium?success=true${returnToParam}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium?canceled=true${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`,
      metadata: {
        userId: userId,
        returnTo: returnTo || '',
      },
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    next(error)
  }
})

// Create portal session (for managing subscription)
router.post('/create-portal-session', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) {
      throw new CustomError('Stripe is not configured', 500)
    }

    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user || !user.stripe_customer_id) {
      throw new CustomError('No active subscription found', 404)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/premium`,
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    next(error)
  }
})

// Cancel subscription
router.post('/cancel', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) {
      throw new CustomError('Stripe is not configured', 500)
    }

    const userId = getUserId(req)
    if (!userId) {
      throw new CustomError('Unauthorized', 401)
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId])
    if (!user || !user.stripe_subscription_id) {
      throw new CustomError('No active subscription found', 404)
    }

    // Cancel subscription at period end
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    res.json({ message: 'Subscription will be canceled at the end of the billing period' })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    next(error)
  }
})


export default router

