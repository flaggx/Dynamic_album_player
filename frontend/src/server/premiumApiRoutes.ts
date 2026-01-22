import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/server/supabaseServiceRole'
import { stripe, STRIPE_PRICE_ID } from '@/server/stripePremium'

function nonEmptyString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export async function getUserIdFromBearer(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const jwt = auth.slice(7).trim()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user) return null
  return data.user.id
}

export async function handleCreateCheckoutSession(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }
  const userId = await getUserIdFromBearer(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let customerId = nonEmptyString(user.stripe_customer_id)
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: nonEmptyString(user.email),
      metadata: { userId },
    })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
  }

  const body = await req.json().catch(() => ({}))
  const returnTo = typeof body.returnTo === 'string' ? body.returnTo : ''
  const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''
  const base = process.env.FRONTEND_URL || 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    mode: 'subscription',
    success_url: `${base}/premium?success=true${returnToParam}`,
    cancel_url: `${base}/premium?canceled=true${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`,
    metadata: { userId, returnTo: returnTo || '' },
  })

  return NextResponse.json({ sessionId: session.id, url: session.url })
}

export async function handleCreatePortalSession(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }
  const userId = await getUserIdFromBearer(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  const portalCustomerId = nonEmptyString(user?.stripe_customer_id)
  if (!user || !portalCustomerId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  const base = process.env.FRONTEND_URL || 'http://localhost:3000'
  const session = await stripe.billingPortal.sessions.create({
    customer: portalCustomerId,
    return_url: `${base}/premium`,
  })
  return NextResponse.json({ url: session.url })
}

export async function handleCancelSubscription(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }
  const userId = await getUserIdFromBearer(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceRoleClient()
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  const subscriptionId = nonEmptyString(user?.stripe_subscription_id)
  if (!user || !subscriptionId) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  return NextResponse.json({ message: 'Subscription will be canceled at the end of the billing period' })
}
