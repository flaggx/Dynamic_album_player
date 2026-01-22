'use client'

import { Toaster } from 'react-hot-toast'
import { AuthProvider, isSupabaseConfigured } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { PlayerProvider } from '@/contexts/PlayerContext'
import BottomPlayer from '@/components/BottomPlayer'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'

function SupabaseMissing() {
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
      }}
    >
      <h2>Supabase configuration required</h2>
      <p>
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in{' '}
        <code>frontend/.env.local</code> (or <code>frontend/.env</code>)
      </p>
      <p>
        See <code>frontend/.env.example</code>. Use the anon or publishable key and project URL from the
        Supabase dashboard (Settings → API).
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
