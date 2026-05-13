import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

const Login = () => {
  const { signInWithEmailPassword, signUpWithEmailPassword, isLoading, isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [emailSentMessage, setEmailSentMessage] = useState(false)

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    window.location.replace('/')
    return null
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setEmailSentMessage(false)
    setPending(true)
    try {
      const result =
        mode === 'signin'
          ? await signInWithEmailPassword(email, password)
          : await signUpWithEmailPassword(email, password)

      if (result.error) {
        setFormError(result.error)
        return
      }
      if (result.needsEmailConfirmation) {
        setEmailSentMessage(true)
        setPassword('')
        return
      }
      window.location.replace('/')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome</h1>
        <p className="auth-subtitle">Sign in to access Lost Camp Studios</p>

        <div className="auth-mode-toggle" role="tablist">
          <button
            type="button"
            className={mode === 'signin' ? 'auth-mode active' : 'auth-mode'}
            onClick={() => {
              setMode('signin')
              setFormError(null)
              setEmailSentMessage(false)
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'auth-mode active' : 'auth-mode'}
            onClick={() => {
              setMode('signup')
              setFormError(null)
              setEmailSentMessage(false)
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth-email-form" onSubmit={handleEmailSubmit}>
          <label className="auth-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <label className="auth-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="auth-input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
          {formError ? <p className="error-message">{formError}</p> : null}
          {emailSentMessage ? (
            <p className="auth-info-message">
              Check your email for a confirmation link, then sign in here.
            </p>
          ) : null}
          <button type="submit" className="auth-button auth-button-primary" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">Sign in with your email and password (Supabase Auth).</p>
      </div>
    </div>
  )
}

export default Login
