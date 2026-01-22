import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isPlaceholder =
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl === 'https://your-project.supabase.co' ||
  supabaseKey === 'your-anon-or-publishable-key'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && !isPlaceholder)

let browserClient: SupabaseClient | null = null

/**
 * Browser-only Supabase client (cookie-aware via @supabase/ssr).
 * Only use after mount (e.g. inside useEffect) — not during SSR.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return null
  if (typeof window === 'undefined') return null
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey)
  }
  return browserClient
}
