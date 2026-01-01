import { useAuth0 } from '@auth0/auth0-react'
import './Auth.css'

const Login = () => {
  console.log('Login component rendering')
  const { loginWithRedirect, isLoading, error: auth0Error } = useAuth0()
  console.log('Auth0 state:', { isLoading, hasError: !!auth0Error })

  const handleLogin = () => {
    loginWithRedirect().catch((error) => {
      console.error('Login error:', error)
    })
  }

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (auth0Error) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Authentication Error</h1>
          <p className="auth-subtitle">There was a problem with authentication</p>
          <div className="error-message">
            {auth0Error.message || 'Please check your Auth0 configuration'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome</h1>
        <p className="auth-subtitle">Sign in to access Lost Camp Studios</p>

        <button onClick={handleLogin} className="auth-button">
          Log In / Sign Up
        </button>

        <p className="auth-footer">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  )
}

export default Login

