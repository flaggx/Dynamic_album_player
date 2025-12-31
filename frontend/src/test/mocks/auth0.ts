import { vi } from 'vitest'

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

