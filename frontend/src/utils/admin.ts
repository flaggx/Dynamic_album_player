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
        
        // Debug: Log all claim keys to see what's available
        if (claims) {
          console.log('All claim keys:', Object.keys(claims))
          console.log('Full claims object:', JSON.stringify(claims, null, 2))
        }
        
        // Check multiple possible locations for roles
        const roles = 
          claims?.['https://lostcampstudios.com/roles'] ||
          claims?.['https://lostcampstudios-api/roles'] ||
          claims?.roles ||
          (user as any)?.['https://lostcampstudios.com/roles'] ||
          (user as any)?.['https://lostcampstudios-api/roles'] ||
          (user as any)?.roles ||
          (user as any)?.permissions ||
          []
        
        // Debug logging
        console.log('ID Token Claims:', claims)
        console.log('User object:', user)
        console.log('Roles found:', roles)
        console.log('Roles type:', typeof roles, 'Is array:', Array.isArray(roles))
        
        // Check for admin role (case-insensitive)
        let hasAdmin = false
        if (Array.isArray(roles)) {
          hasAdmin = roles.some(role => 
            role?.toLowerCase() === 'admin' || 
            role?.toLowerCase() === 'administrator'
          )
        } else if (typeof roles === 'string') {
          hasAdmin = roles.toLowerCase().includes('admin')
        }
        
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

