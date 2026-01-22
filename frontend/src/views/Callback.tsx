import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'
import { syncAuthUserToPublicProfile } from '../services/syncAuthProfile'

const Callback = () => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const finish = async () => {
      const supabase = getSupabase()
      if (!supabase) {
        router.replace('/login')
        return
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError) {
        setError(sessionError.message)
        return
      }

      const user = session?.user
      if (!user) {
        router.replace('/login')
        return
      }

      try {
        await syncAuthUserToPublicProfile(user)
      } catch (e) {
        console.error('Error syncing user:', e)
      }

      router.replace('/')
    }

    void finish()
  }, [router])

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <p>Could not complete login: {error}</p>
        <button type="button" onClick={() => router.replace('/login')}>
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div>Completing login...</div>
    </div>
  )
}

export default Callback
