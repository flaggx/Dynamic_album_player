import { useAuth0 } from '@auth0/auth0-react'

// Check if current user has admin role
export const useIsAdmin = (): boolean => {
  const { user } = useAuth0()
  
  if (!user) return false
  
  // Auth0 roles can be in different places depending on configuration
  const roles = 
    user['https://lostcampstudios.com/roles'] ||
    (user as any).roles ||
    (user as any).permissions ||
    []
  
  return Array.isArray(roles) && (roles.includes('admin') || roles.includes('Admin'))
}

