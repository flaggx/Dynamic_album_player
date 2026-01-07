import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import { premiumApi } from '../services/api'
import { PremiumStatus } from '../types'
import { useIsAdmin } from '../utils/admin'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import './Premium.css'

const Premium = () => {
  const { user, isAuthenticated, isLoading: authLoading, getAccessTokenSilently } = useAuth0()
  const isAdmin = useIsAdmin()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<PremiumStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Check for success/cancel from Stripe redirect
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const returnTo = searchParams.get('returnTo')

    if (success === 'true') {
      toast.success('Subscription activated! Welcome to Premium!')
      // Redirect to returnTo if provided, otherwise stay on premium page
      if (returnTo) {
        window.location.href = returnTo + '?success=true&returnTo=' + encodeURIComponent(returnTo)
      } else {
        window.history.replaceState({}, '', '/premium')
      }
    } else if (canceled === 'true') {
      toast.error('Subscription canceled')
      // Redirect back if returnTo provided
      if (returnTo) {
        window.location.href = returnTo
      } else {
        window.history.replaceState({}, '', '/premium')
      }
    }
  }, [searchParams])

  useEffect(() => {
    const loadStatus = async () => {
      // Wait for auth to finish loading
      if (authLoading) return
      
      // If not authenticated, set default free status
      if (!isAuthenticated || !user?.sub) {
        setStatus({
          isPremium: false,
          subscriptionStatus: 'free',
          subscriptionTier: 'free',
          subscriptionEndsAt: null,
          stripeCustomerId: null,
        })
        setIsLoading(false)
        return
      }

      // Wait for access token to be available and token getter to be set up
      // Retry a few times to handle race condition with AuthSetup
      let retries = 5
      let lastError: any = null
      
      while (retries > 0) {
        try {
          // Ensure token is available
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          })
          
          if (!token) {
            throw new Error('Token not available')
          }

          // Longer delay to ensure token getter is set up in api.ts
          // AuthSetup component needs time to call setAuthTokenGetter
          await new Promise(resolve => setTimeout(resolve, 300))
          
          setIsLoading(true)
          const premiumStatus = await premiumApi.getStatus()
          setStatus(premiumStatus)
          setIsLoading(false)
          return // Success, exit retry loop
        } catch (error: any) {
          lastError = error
          retries--
          
          // If it's a 401 and we have retries left, wait and try again
          if (retries > 0 && (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('token') || error.message?.includes('Invalid'))) {
            console.log(`Retrying premium status load... ${retries} retries left`)
            // Exponential backoff: wait longer on each retry
            const delay = (6 - retries) * 300 // 300ms, 600ms, 900ms, 1200ms
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          // If no retries left or different error, break
          break
        }
      }

      // If we get here, all retries failed
      console.error('Error loading premium status after retries:', lastError)
      // Set default free status on error
      setStatus({
        isPremium: false,
        subscriptionStatus: 'free',
        subscriptionTier: 'free',
        subscriptionEndsAt: null,
        stripeCustomerId: null,
      })
      setIsLoading(false)
    }

    loadStatus()
  }, [user, isAuthenticated, authLoading, getAccessTokenSilently])

  const handleSubscribe = async () => {
    if (!user?.sub) {
      toast.error('Please log in to subscribe')
      return
    }

    try {
      setIsProcessing(true)
      const returnTo = searchParams.get('returnTo')
      const { url } = await premiumApi.createCheckoutSession(returnTo || undefined)
      if (url) {
        window.location.href = url
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      toast.error(error.message || 'Failed to start subscription process')
      setIsProcessing(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!user?.sub) {
      toast.error('Please log in to manage subscription')
      return
    }

    try {
      setIsProcessing(true)
      const { url } = await premiumApi.createPortalSession()
      if (url) {
        window.location.href = url
      } else {
        toast.error('Failed to create portal session')
      }
    } catch (error: any) {
      console.error('Error creating portal session:', error)
      toast.error(error.message || 'Failed to open subscription management')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Sidebar />
        <TopBar />
        <div className="main-content">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <TopBar />
      <div className="main-content">
        <div className="premium-page">
          <div className="premium-header">
            <h1>Premium Membership</h1>
            <p className="premium-subtitle">Unlock unlimited song uploads and more</p>
          </div>

          <div className="premium-content">
            {(status?.isPremium || isAdmin) ? (
              <div className="premium-status premium-active">
                <div className="status-badge premium-badge">
                  <span className="badge-icon">✓</span>
                  <span>{isAdmin ? 'Admin Access' : 'Premium Active'}</span>
                </div>
                <div className="status-info">
                  <p>{isAdmin ? 'You have admin access with premium features.' : 'Your premium subscription is active.'}</p>
                  {!isAdmin && status?.subscriptionEndsAt && (
                    <p className="status-date">
                      Renews on {new Date(status.subscriptionEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {!isAdmin && (
                  <button
                    className="premium-button manage-button"
                    onClick={handleManageSubscription}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Loading...' : 'Manage Subscription'}
                  </button>
                )}
              </div>
            ) : (
              <div className="premium-status premium-inactive">
                <div className="status-badge free-badge">
                  <span>Free Plan</span>
                </div>
                <div className="status-info">
                  <p>You're currently on the free plan.</p>
                  <p className="status-description">
                    Free users can listen to all albums but cannot upload songs or create albums.
                  </p>
                </div>
              </div>
            )}

            <div className="premium-features">
              <h2>Premium Features</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon upload-icon"></div>
                  <h3>Unlimited Uploads</h3>
                  <p>Upload as many songs and albums as you want</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon plus-icon"></div>
                  <h3>Create Albums</h3>
                  <p>Build and share your music collections</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon check-icon"></div>
                  <h3>Full Access</h3>
                  <p>Access all platform features without restrictions</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon star-icon"></div>
                  <h3>Premium Badge</h3>
                  <p>Show off your premium status to the community</p>
                </div>
              </div>
            </div>

            <div className="premium-pricing">
              <div className="pricing-card">
                <div className="pricing-header">
                  <h3>Premium</h3>
                  <div className="pricing-amount">
                    <span className="price">$20</span>
                    <span className="period">/month</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>✓ Unlimited song uploads</li>
                  <li>✓ Create unlimited albums</li>
                  <li>✓ Full platform access</li>
                  <li>✓ Premium badge</li>
                  <li>✓ Priority support</li>
                </ul>
                {!status?.isPremium && !isAdmin && (
                  <button
                    className="premium-button subscribe-button"
                    onClick={handleSubscribe}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Subscribe Now'}
                  </button>
                )}
                {isAdmin && (
                  <div className="admin-premium-note">
                    <p>As an admin, you have premium access to all features.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Premium

