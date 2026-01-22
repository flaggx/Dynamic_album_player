import { handleCancelSubscription } from '@/server/premiumApiRoutes'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  return handleCancelSubscription(req)
}
