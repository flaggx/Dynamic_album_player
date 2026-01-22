import type { User } from '@supabase/supabase-js'
import { usersApi } from './api'

/** Upsert `public.users` from a Supabase Auth user (`auth.users`). */
export async function syncAuthUserToPublicProfile(user: User): Promise<void> {
  const meta = user.user_metadata || {}
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    [meta.given_name, meta.family_name].filter(Boolean).join(' ').trim() ||
    undefined
  const picture =
    (meta.avatar_url as string) || (meta.picture as string) || undefined
  const email =
    user.email || `user-${user.id.replace(/[^a-zA-Z0-9-]/g, '-')}@users.supabase.local`

  await usersApi.createOrUpdate({
    id: user.id,
    email,
    name,
    picture,
    bio: undefined,
  })
}
