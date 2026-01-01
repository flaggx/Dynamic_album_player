import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
// Toaster imported but not used - react-hot-toast works without explicit Toaster component in newer versions
import { PlayerProvider } from './contexts/PlayerContext'
import ProtectedRoute from './components/ProtectedRoute'
import BottomPlayer from './components/BottomPlayer'
import Home from './pages/Home'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Discover from './pages/Discover'
import CreateAlbum from './pages/CreateAlbum'
import EditAlbum from './pages/EditAlbum'
import AlbumDetail from './pages/AlbumDetail'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import MyAlbums from './pages/MyAlbums'
import MyFavorites from './pages/MyFavorites'
import Admin from './pages/Admin'
import { setAuthTokenGetter } from './services/api'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE
const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#f5f5f5'
        }}>
          <h2 style={{ color: '#c33' }}>Something went wrong</h2>
          <p>{this.state.error?.message || 'An error occurred'}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  console.log('App rendering, domain:', domain, 'clientId:', clientId ? 'set' : 'missing')
  
  // Always render router, but conditionally wrap with Auth0Provider
  const routes = (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-album"
          element={
            <ProtectedRoute>
              <CreateAlbum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-album/:id"
          element={
            <ProtectedRoute>
              <EditAlbum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/album/:id"
          element={
            <ProtectedRoute>
              <AlbumDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-albums"
          element={
            <ProtectedRoute>
              <MyAlbums />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-favorites"
          element={
            <ProtectedRoute>
              <MyFavorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )

  if (!domain || !clientId || domain === 'your-auth0-domain.auth0.com' || clientId === 'your-client-id') {
    console.log('Auth0 not configured, showing config message')
    return (
      <ErrorBoundary>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h2>Auth0 Configuration Required</h2>
          <p>Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in <code>frontend/.env</code></p>
          <p>See <code>frontend/.env.example</code> for reference</p>
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', maxWidth: '600px' }}>
            <p><strong>Quick setup:</strong></p>
            <ol style={{ textAlign: 'left', marginTop: '1rem' }}>
              <li>Get your Auth0 credentials from <a href="https://manage.auth0.com" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>Auth0 Dashboard</a></li>
              <li>Edit <code>frontend/.env</code> with your actual values</li>
              <li>Restart the dev server</li>
            </ol>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              Current values: Domain={domain || 'not set'}, ClientID={clientId ? 'set' : 'not set'}
            </p>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  console.log('Rendering with Auth0Provider')
  return (
    <ErrorBoundary>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: redirectUri,
          audience: audience,
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <AuthSetup>
          <PlayerProvider>
            {routes}
            <BottomPlayer />
          </PlayerProvider>
        </AuthSetup>
      </Auth0Provider>
    </ErrorBoundary>
  )
}

// Component to set up auth token getter
const AuthSetup = ({ children }: { children: React.ReactNode }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    setAuthTokenGetter(async () => {
      try {
        // Get access token with audience for API
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: audience,
          },
          cacheMode: 'off', // Force fresh token
        })
        console.log('Access token retrieved successfully')
        return token
      } catch (error: any) {
        console.error('Error getting access token:', error)
        // If token refresh fails, user may need to re-authenticate
        if (error.error === 'login_required' || error.error === 'consent_required') {
          console.warn('User needs to re-authenticate')
        }
        return undefined
      }
    })
  }, [getAccessTokenSilently, audience, isAuthenticated])

  return <>{children}</>
}

export default App

