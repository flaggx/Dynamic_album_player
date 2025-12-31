import { vi } from 'vitest'
import { ReactNode } from 'react'

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

// Mock Auth0Provider component
export const Auth0Provider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>
}

// Mock useAuth0 hook
export const useAuth0 = vi.fn(() => mockUseAuth0())

