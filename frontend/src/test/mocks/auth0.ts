import { vi } from 'vitest'
import { ReactNode } from 'react'
import React from 'react'

export const mockUseAuth0 = () => ({
  user: {
    sub: 'auth0|123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
  },
  isAuthenticated: true,
  isLoading: false,
  loginWithRedirect: vi.fn(),
  logout: vi.fn(),
  getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
})

// Mock Auth0Provider component (using createElement instead of JSX for .ts file)
export const Auth0Provider = ({ children }: { children: ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}

// Mock useAuth0 hook
export const useAuth0 = vi.fn(() => mockUseAuth0())

