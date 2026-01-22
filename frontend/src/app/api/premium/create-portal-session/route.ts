import { handleCreatePortalSession } from '@/server/premiumApiRoutes'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  return handleCreatePortalSession(req)
}
