import { ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

interface PublicRouteProps {
  children: ReactNode
}

/**
 * PublicRoute allows access without authentication.
 * The children components should handle unauthenticated state gracefully.
 */
const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isLoading } = useAuth0()

  // Show loading only while Auth0 is initializing
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  // Always render children - no authentication required
  return <>{children}</>
}

export default PublicRoute

