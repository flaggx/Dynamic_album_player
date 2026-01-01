import { useAuth0 } from '@auth0/auth0-react'
import { useState, useEffect } from 'react'

// Check if current user has admin role
export const useIsAdmin = (): boolean => {
  const { user, getIdTokenClaims, isAuthenticated } = useAuth0()
  const [isAdmin, setIsAdmin] = useState(false)
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isAuthenticated || !user) {
        setIsAdmin(false)
        return
      }
      
      try {
        // Get ID token claims which contain custom claims like roles
        const claims = await getIdTokenClaims()
        
        // Check multiple possible locations for roles
        const roles = 
          claims?.['https://lostcampstudios.com/roles'] ||
          claims?.['https://lostcampstudios-api/roles'] ||
          (user as any)['https://lostcampstudios.com/roles'] ||
          (user as any)['https://lostcampstudios-api/roles'] ||
          (user as any).roles ||
          (user as any).permissions ||
          []
        
        // Debug logging
        console.log('ID Token Claims:', claims)
        console.log('User object:', user)
        console.log('Roles found:', roles)
        
        const hasAdmin = Array.isArray(roles) && (roles.includes('admin') || roles.includes('Admin'))
        console.log('Is admin?', hasAdmin)
        setIsAdmin(hasAdmin)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }
    
    checkAdmin()
  }, [user, isAuthenticated, getIdTokenClaims])
  
  return isAdmin
}

