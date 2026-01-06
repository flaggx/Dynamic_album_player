import express from 'express'
import Stripe from 'stripe'
import { db } from '../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'

const router = express.Router()
const dbRun = promisify(db.run.bind(db)) as (sql: string, params?: any[]) => Promise<any>
const dbGet = promisify(db.get.bind(db)) as (sql: string, params?: any[]) => Promise<any>

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
}) : null

// Webhook handler for Stripe events (needs raw body)
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  Stripe webhook secret not configured')
    return res.status(400).send('Webhook secret not configured')
  }

  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Log event
  const eventId = uuidv4()
  await dbRun(
    `INSERT INTO stripe_events (id, event_type, stripe_event_id, data)
     VALUES (?, ?, ?, ?)`,
    [eventId, event.type, event.id, JSON.stringify(event.data)]
  )

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (userId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          
          await dbRun(
            `UPDATE users 
             SET stripe_subscription_id = ?,
                 subscription_status = ?,
                 subscription_tier = ?,
                 subscription_started_at = ?,
                 subscription_ends_at = ?
             WHERE id = ?`,
            [
              subscription.id,
              subscription.status === 'active' ? 'active' : subscription.status,
              'premium',
              new Date((subscription as any).current_period_start * 1000).toISOString(),
              new Date((subscription as any).current_period_end * 1000).toISOString(),
              userId,
            ]
          )
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const user = await dbGet('SELECT * FROM users WHERE stripe_customer_id = ?', [customerId])
        if (user) {
          if (subscription.status === 'active') {
            await dbRun(
              `UPDATE users 
               SET stripe_subscription_id = ?,
                   subscription_status = ?,
                   subscription_tier = ?,
                   subscription_ends_at = ?
               WHERE id = ?`,
              [
                subscription.id,
                'active',
                'premium',
                new Date((subscription as any).current_period_end * 1000).toISOString(),
                user.id,
              ]
            )
          } else {
            // Subscription canceled or past due
            await dbRun(
              `UPDATE users 
               SET subscription_status = ?,
                   subscription_tier = ?,
                   subscription_ends_at = ?
               WHERE id = ?`,
              [
                subscription.status,
                'free',
                (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
                user.id,
              ]
            )
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const user = await dbGet('SELECT * FROM users WHERE stripe_customer_id = ?', [customerId])
        if (user && (invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string)
          
          await dbRun(
            `UPDATE users 
             SET subscription_status = ?,
                 subscription_tier = ?,
                 subscription_ends_at = ?
             WHERE id = ?`,
            [
              'active',
              'premium',
              new Date((subscription as any).current_period_end * 1000).toISOString(),
              user.id,
            ]
          )
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const user = await dbGet('SELECT * FROM users WHERE stripe_customer_id = ?', [customerId])
        if (user) {
          await dbRun(
            `UPDATE users 
             SET subscription_status = ?
             WHERE id = ?`,
            ['past_due', user.id]
          )
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await dbRun('UPDATE stripe_events SET processed = 1 WHERE id = ?', [eventId])

    res.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router

