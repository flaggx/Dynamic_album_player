'use client'

import { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface PublicRouteProps {
  children: ReactNode
}

/**
 * PublicRoute allows access without authentication.
 * The children components should handle unauthenticated state gracefully.
 */
const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}

export default PublicRoute
