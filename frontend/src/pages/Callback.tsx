import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { usersApi } from '../services/api'

const Callback = () => {
  const { isAuthenticated, isLoading, user } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoading && isAuthenticated && user) {
        try {
          // Sync user to backend
          await usersApi.createOrUpdate({
            id: user.sub || '',
            email: user.email || '',
            name: user.name || undefined,
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
  }, [isAuthenticated, isLoading, user, navigate])

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

