'use client'

import { Toaster } from 'react-hot-toast'
import { AuthProvider, isSupabaseConfigured } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { PlayerProvider } from '@/contexts/PlayerContext'
import BottomPlayer from '@/components/BottomPlayer'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'

function SupabaseMissing() {
  const onVercelHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.vercel.app') || window.location.hostname === 'vercel.app')

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        maxWidth: '40rem',
        margin: '0 auto',
      }}
    >
      <h2>Supabase configuration required</h2>
      <p>
        The browser needs <code>NEXT_PUBLIC_SUPABASE_URL</code> and either{' '}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
        (values from Supabase → <strong>Settings</strong> → <strong>API</strong>).
      </p>
      <p>
        <strong>Local:</strong> put them in <code>frontend/.env.local</code> (see <code>frontend/.env.example</code>
        ), then restart <code>npm run dev</code>.
      </p>
      <p>
        <strong>Vercel / hosted:</strong> <code>.env.local</code> is not deployed. In the Vercel dashboard go to{' '}
        <strong>Project → Settings → Environment Variables</strong>, add the same <code>NEXT_PUBLIC_*</code> names
        for <strong>Production</strong> and <strong>Preview</strong>, then trigger a new deployment so the build
        can embed them.
        {onVercelHost ? (
          <>
            {' '}
            You can sync from a filled <code>.env.local</code> using <code>npm run vercel:push-env</code> from{' '}
            <code>frontend/</code>.
          </>
        ) : null}
      </p>
    </div>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <AppErrorBoundary>
        <SupabaseMissing />
      </AppErrorBoundary>
    )
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <SidebarProvider>
          <PlayerProvider>
            {children}
            <BottomPlayer />
            <Toaster position="bottom-center" />
          </PlayerProvider>
        </SidebarProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
