import Stripe from 'stripe'
import { v4 as uuidv4 } from 'uuid'
import { createServiceRoleClient } from './supabaseServiceRole'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
  : null

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || ''
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function processStripeWebhook(rawBody: Buffer, signature: string | null) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return { ok: false as const, status: 400, body: 'Webhook not configured' }
  }
  if (!signature) {
    return { ok: false as const, status: 400, body: 'Missing stripe-signature' }
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid signature'
    return { ok: false as const, status: 400, body: `Webhook Error: ${msg}` }
  }

  const supabase = createServiceRoleClient()
  const eventRowId = uuidv4()
  await supabase.from('stripe_events').insert({
    id: eventRowId,
    event_type: event.type,
    stripe_event_id: event.id,
    data: JSON.stringify(event.data),
    processed: false,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const cps = (subscription as unknown as { current_period_start?: number }).current_period_start
          const cpe = (subscription as unknown as { current_period_end?: number }).current_period_end
          await supabase
            .from('users')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
              subscription_tier: 'premium',
              subscription_started_at: cps ? new Date(cps * 1000).toISOString() : null,
              subscription_ends_at: cpe ? new Date(cpe * 1000).toISOString() : null,
            })
            .eq('id', userId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (user?.id) {
          const cpe = (subscription as unknown as { current_period_end?: number }).current_period_end
          if (subscription.status === 'active') {
            await supabase
              .from('users')
              .update({
                stripe_subscription_id: subscription.id,
                subscription_status: 'active',
                subscription_tier: 'premium',
                subscription_ends_at: cpe ? new Date(cpe * 1000).toISOString() : null,
              })
              .eq('id', user.id)
          } else {
            await supabase
              .from('users')
              .update({
                subscription_status: subscription.status,
                subscription_tier: 'free',
                subscription_ends_at: cpe ? new Date(cpe * 1000).toISOString() : null,
              })
              .eq('id', user.id)
          }
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subId = (invoice as unknown as { subscription?: string | null }).subscription
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (user?.id && subId) {
          const subscription = await stripe.subscriptions.retrieve(subId)
          const cpe = (subscription as unknown as { current_period_end?: number }).current_period_end
          await supabase
            .from('users')
            .update({
              subscription_status: 'active',
              subscription_tier: 'premium',
              subscription_ends_at: cpe ? new Date(cpe * 1000).toISOString() : null,
            })
            .eq('id', user.id)
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (user?.id) {
          await supabase.from('users').update({ subscription_status: 'past_due' }).eq('id', user.id)
        }
        break
      }
      default:
        break
    }

    await supabase.from('stripe_events').update({ processed: true }).eq('id', eventRowId)
    return { ok: true as const, status: 200, body: { received: true } }
  } catch (e) {
    console.error(e)
    return { ok: false as const, status: 500, body: { error: 'Webhook processing failed' } }
  }
}
