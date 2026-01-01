import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { usersApi } from '../services/api'

const Callback = () => {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0()
  const navigate = useNavigate()
  const [tokenReady, setTokenReady] = useState(false)

  // Wait for access token to be available
  useEffect(() => {
    const waitForToken = async () => {
      if (!isAuthenticated || isLoading) {
        setTokenReady(false)
        return
      }

      // Wait a bit for AuthSetup to set up the token getter
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        // Try to get access token to ensure it's available
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE
        if (audience) {
          await getAccessTokenSilently({
            authorizationParams: {
              audience: audience,
            },
          })
          setTokenReady(true)
        } else {
          // If no audience, still mark as ready (might not need token)
          setTokenReady(true)
        }
      } catch (error) {
        console.warn('Token not ready yet, will retry:', error)
        // Retry after a delay
        setTimeout(() => setTokenReady(true), 1000)
      }
    }

    waitForToken()
  }, [isAuthenticated, isLoading, getAccessTokenSilently])

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoading && isAuthenticated && user && tokenReady) {
        // Ensure we have required fields before syncing
        const userId = user.sub
        const userEmail = user.email || user.nickname || user.name
        
        if (!userId || !userEmail) {
          console.warn('Missing required user fields for sync:', { userId, email: userEmail })
          // Still navigate even if we can't sync
          navigate('/')
          return
        }

        try {
          // Sync user to backend
          await usersApi.createOrUpdate({
            id: userId,
            email: userEmail,
            name: user.name || user.nickname || undefined,
            picture: user.picture || undefined,
            bio: undefined,
          })
        } catch (error) {
          console.error('Error syncing user:', error)
          // Don't block navigation on sync error
        }
        navigate('/')
      } else if (!isLoading && !isAuthenticated) {
        navigate('/login')
      }
    }

    syncUser()
  }, [isAuthenticated, isLoading, user, navigate, tokenReady])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Completing login...</div>
    </div>
  )
}

export default Callback

