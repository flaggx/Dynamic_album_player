import { NextResponse } from 'next/server'
import { processStripeWebhook } from '@/server/stripePremium'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('stripe-signature')
  const result = await processStripeWebhook(rawBody, sig)
  if (!result.ok) {
    return new NextResponse(typeof result.body === 'string' ? result.body : JSON.stringify(result.body), {
      status: result.status,
    })
  }
  return NextResponse.json(result.body)
}
