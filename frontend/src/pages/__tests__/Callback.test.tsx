import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '../../test/utils'
import Callback from '../Callback'
import { usersApi } from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  usersApi: {
    createOrUpdate: vi.fn(),
  },
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Auth0
const mockGetAccessTokenSilently = vi.fn()
const mockGetIdTokenClaims = vi.fn()
const mockUseAuth0 = vi.fn()

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockUseAuth0(),
}))

// Mock environment variables
vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://lostcampstudios-api')

describe('Callback - User Sync for Different Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAccessTokenSilently.mockResolvedValue('mock-token')
    mockGetIdTokenClaims.mockResolvedValue({})
    vi.mocked(usersApi.createOrUpdate).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
    })
  })

  describe('Google Sign-Up', () => {
    it('should sync user with complete Google profile data', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'google.user@gmail.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'google-oauth2|123456789',
          email: 'google.user@gmail.com',
          name: 'Google User',
          picture: 'https://example.com/google-avatar.jpg',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'google-oauth2|123456789',
            email: 'google.user@gmail.com',
            name: 'Google User',
            picture: 'https://example.com/google-avatar.jpg',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('GitHub Sign-Up', () => {
    it('should sync user with GitHub profile data (including nickname)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'github.user@example.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'github|987654321',
          email: 'github.user@example.com',
          name: 'GitHub User',
          nickname: 'githubuser',
          picture: 'https://github.com/avatars/githubuser.jpg',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'github|987654321',
            email: 'github.user@example.com',
            name: 'GitHub User',
            picture: 'https://github.com/avatars/githubuser.jpg',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should use nickname as name fallback for GitHub user', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'github.user@example.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'github|987654321',
          email: 'github.user@example.com',
          nickname: 'githubuser',
          picture: 'https://github.com/avatars/githubuser.jpg',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'github|987654321',
            email: 'github.user@example.com',
            name: 'githubuser',
            picture: 'https://github.com/avatars/githubuser.jpg',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Apple Sign-Up', () => {
    it('should sync user with Apple profile data (with email)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'apple.user@icloud.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'apple|1234567890',
          email: 'apple.user@icloud.com',
          given_name: 'Apple',
          family_name: 'User',
          picture: undefined,
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'apple|1234567890',
            email: 'apple.user@icloud.com',
            name: 'Apple User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should sync Apple user without email (using ID token claims)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'apple.user@privaterelay.appleid.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'apple|1234567890',
          given_name: 'Apple',
          family_name: 'User',
          picture: undefined,
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(mockGetIdTokenClaims).toHaveBeenCalled()
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'apple|1234567890',
            email: 'apple.user@privaterelay.appleid.com',
            name: 'Apple User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should sync Apple user with no email (using placeholder)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'apple|1234567890',
          given_name: 'Apple',
          family_name: 'User',
          picture: undefined,
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'apple|1234567890',
            email: 'apple-1234567890@lostcampstudios.local',
            name: 'Apple User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should sync Apple user with only given_name', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'apple.user@icloud.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'apple|1234567890',
          email: 'apple.user@icloud.com',
          given_name: 'Apple',
          picture: undefined,
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'apple|1234567890',
            email: 'apple.user@icloud.com',
            name: 'Apple',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Facebook Sign-Up', () => {
    it('should sync user with Facebook profile data', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'facebook.user@example.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'facebook|123456789',
          name: 'Facebook User',
          picture: 'https://graph.facebook.com/user/picture',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'facebook|123456789',
            email: 'facebook.user@example.com',
            name: 'Facebook User',
            picture: 'https://graph.facebook.com/user/picture',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should handle Facebook user without email in user object', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'facebook.user@example.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'facebook|123456789',
          name: 'Facebook User',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(mockGetIdTokenClaims).toHaveBeenCalled()
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'facebook|123456789',
            email: 'facebook.user@example.com',
            name: 'Facebook User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe('X (Twitter) Sign-Up', () => {
    it('should sync user with X profile data', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'x.user@example.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'twitter|987654321',
          name: 'X User',
          nickname: 'xuser',
          picture: 'https://pbs.twimg.com/profile_images/user.jpg',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'twitter|987654321',
            email: 'x.user@example.com',
            name: 'X User',
            picture: 'https://pbs.twimg.com/profile_images/user.jpg',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should handle X user without email (using nickname fallback)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'twitter|987654321',
          name: 'X User',
          nickname: 'xuser',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'twitter|987654321',
            email: 'xuser', // Uses nickname as fallback before placeholder
            name: 'X User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should handle X user without email or nickname (using placeholder)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'twitter|987654321',
          // No name, no nickname - should use placeholder
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'twitter|987654321',
            email: 'x-987654321@lostcampstudios.local', // Normalized from twitter to x
            name: undefined,
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Microsoft Sign-Up', () => {
    it('should sync user with Microsoft profile data', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'microsoft.user@outlook.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'windowslive|123456789',
          name: 'Microsoft User',
          given_name: 'Microsoft',
          family_name: 'User',
          picture: 'https://graph.microsoft.com/v1.0/me/photo/$value',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'windowslive|123456789',
            email: 'microsoft.user@outlook.com',
            name: 'Microsoft User',
            picture: 'https://graph.microsoft.com/v1.0/me/photo/$value',
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should handle Microsoft user with given_name/family_name', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'microsoft.user@outlook.com',
      })

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'windowslive|123456789',
          given_name: 'Microsoft',
          family_name: 'User',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'windowslive|123456789',
            email: 'microsoft.user@outlook.com',
            name: 'Microsoft User',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle user with no name or email (minimal data)', async () => {
      mockGetIdTokenClaims.mockResolvedValue({})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'auth0|minimal-user',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'auth0|minimal-user',
            email: 'auth0-minimal-user@lostcampstudios.local',
            name: undefined,
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )
    })

    it('should handle sync error gracefully and still navigate', async () => {
      mockGetIdTokenClaims.mockResolvedValue({
        email: 'error@example.com',
      })

      vi.mocked(usersApi.createOrUpdate).mockRejectedValue(new Error('API Error'))

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'auth0|error-user',
          email: 'error@example.com',
          name: 'Error User',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<Callback />)

      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalled()
          expect(mockNavigate).toHaveBeenCalledWith('/')
        },
        { timeout: 3000 }
      )

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should navigate to login if not authenticated', async () => {
      mockUseAuth0.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        getAccessTokenSilently: vi.fn(),
        getIdTokenClaims: vi.fn(),
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('should handle missing user ID (sub)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockUseAuth0.mockReturnValue({
        user: {
          // Missing sub
          email: 'test@example.com',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(consoleErrorSpy).toHaveBeenCalled()
          expect(mockNavigate).toHaveBeenCalledWith('/')
          expect(usersApi.createOrUpdate).not.toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle ID token claims error gracefully', async () => {
      mockGetIdTokenClaims.mockRejectedValue(new Error('Claims error'))
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'auth0|test-user',
          // No email in user object
          nickname: 'testuser',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(mockGetIdTokenClaims).toHaveBeenCalled()
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            'Could not get ID token claims:',
            expect.any(Error)
          )
          // Should fallback to nickname
          expect(usersApi.createOrUpdate).toHaveBeenCalledWith({
            id: 'auth0|test-user',
            email: 'testuser',
            name: 'testuser',
            picture: undefined,
            bio: undefined,
          })
        },
        { timeout: 3000 }
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Token Handling', () => {
    it('should wait for token before syncing', async () => {
      const delayedGetAccessToken = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('token'), 100)))

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'auth0|test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: delayedGetAccessToken,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

          // Should not sync immediately
      expect(usersApi.createOrUpdate).not.toHaveBeenCalled()

      // Should sync after token is ready
      await waitFor(
        () => {
          expect(usersApi.createOrUpdate).toHaveBeenCalled()
        },
        { timeout: 2000 }
      )
    })

    it('should handle token error and still proceed', async () => {
      mockGetAccessTokenSilently.mockRejectedValue(new Error('Token error'))
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockUseAuth0.mockReturnValue({
        user: {
          sub: 'auth0|test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
        isAuthenticated: true,
        isLoading: false,
        getAccessTokenSilently: mockGetAccessTokenSilently,
        getIdTokenClaims: mockGetIdTokenClaims,
        loginWithRedirect: vi.fn(),
        logout: vi.fn(),
      })

      render(<Callback />)

      await waitFor(
        () => {
          expect(consoleWarnSpy).toHaveBeenCalled()
          // Should still sync after retry timeout
          expect(usersApi.createOrUpdate).toHaveBeenCalled()
        },
        { timeout: 2500 }
      )

      consoleWarnSpy.mockRestore()
    })
  })
})
