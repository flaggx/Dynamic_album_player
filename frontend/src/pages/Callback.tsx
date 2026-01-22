import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { usersApi } from '../services/api'

const Callback = () => {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, getIdTokenClaims } = useAuth0()
  const navigate = useNavigate()
  const [tokenReady, setTokenReady] = useState(false)

  // Wait for access token to be available
  useEffect(() => {
    const waitForToken = async () => {
      if (!isAuthenticated || isLoading) {
        setTokenReady(false)
        return
      }

      // Wait a bit for AuthSetup to set up the token getter
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        // Try to get access token to ensure it's available
        const audience = import.meta.env.VITE_AUTH0_AUDIENCE
        if (audience) {
          await getAccessTokenSilently({
            authorizationParams: {
              audience: audience,
            },
          })
          setTokenReady(true)
        } else {
          // If no audience, still mark as ready (might not need token)
          setTokenReady(true)
        }
      } catch (error) {
        console.warn('Token not ready yet, will retry:', error)
        // Retry after a delay
        setTimeout(() => setTokenReady(true), 1000)
      }
    }

    waitForToken()
  }, [isAuthenticated, isLoading, getAccessTokenSilently])

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoading && isAuthenticated && user && tokenReady) {
        // Ensure we have required fields before syncing
        const userId = user.sub
        
        if (!userId) {
          console.error('Missing user ID (sub) for sync:', { user })
          navigate('/')
          return
        }

        // Log full user object for debugging
        console.log('=== USER SYNC DEBUG START ===')
        console.log('Provider:', userId.match(/^([^|]+)/)?.[1] || 'unknown')
        console.log('Syncing user - Full user object:', JSON.stringify(user, null, 2))
        console.log('User object keys:', Object.keys(user))
        console.log('User.email:', user.email)
        console.log('User.name:', user.name)
        console.log('User.given_name:', (user as any).given_name)
        console.log('User.family_name:', (user as any).family_name)
        console.log('User.nickname:', user.nickname)
        
        // Get ID token claims early - they often contain email/name for providers like Apple
        let idTokenClaims: any = null
        try {
          idTokenClaims = await getIdTokenClaims()
          if (idTokenClaims) {
            console.log('ID token claims:', JSON.stringify(idTokenClaims, null, 2))
          }
        } catch (error) {
          console.warn('Could not get ID token claims:', error)
        }
        
        // Try multiple sources for email
        // Different providers (Google, GitHub, Apple, Facebook, X, Microsoft) provide email differently
        let userEmail = user.email
        
        // Check ID token claims for email (Apple often provides email here)
        if (!userEmail && idTokenClaims) {
          // Try multiple possible claim locations
          userEmail = idTokenClaims.email || 
                     idTokenClaims['https://lostcampstudios.com/email'] ||
                     (idTokenClaims as any).https?.email
          
          // If email_verified is true, email should be available
          if (!userEmail && (idTokenClaims as any).email_verified && idTokenClaims.email) {
            userEmail = idTokenClaims.email
          }
          
          if (userEmail) {
            console.log('Got email from ID token claims:', userEmail)
          } else {
            console.log('No email found in ID token claims. Available keys:', Object.keys(idTokenClaims))
            // Log all claim values for debugging
            console.log('ID token claims values:', JSON.stringify(idTokenClaims, null, 2))
          }
        }
        
        // Some providers might have email in different user object properties
        // Also check user_metadata and app_metadata (where Auth0 Actions might store data)
        if (!userEmail) {
          const userAny = user as any
          userEmail = userAny.email_address ||
                     userAny.mail ||
                     userAny.primary_email ||
                     userAny.emailAddress ||
                     userAny.user_metadata?.email_from_claims ||
                     userAny.user_metadata?.email ||
                     userAny.app_metadata?.email
          if (userEmail) {
            console.log('Got email from alternative user properties or metadata:', userEmail)
          }
        }
        
        // Fallback: try nickname or name as email (not ideal, but better than nothing)
        if (!userEmail) {
          userEmail = user.nickname || user.name
          if (userEmail) {
            console.log('Using nickname/name as email fallback:', userEmail)
          }
        }
        
        // Last resort: create a placeholder email from user ID
        // This ensures the user can still be created in the database
        // Format: provider-id@lostcampstudios.local
        if (!userEmail) {
          // Extract provider and ID from sub (e.g., "github|123456" -> "github-123456")
          const providerMatch = userId.match(/^([^|]+)\|(.+)$/)
          if (providerMatch) {
            const [, provider, id] = providerMatch
            // Normalize provider name (e.g., "google-oauth2" -> "google", "windowslive" -> "microsoft", "twitter" -> "x")
            const normalizedProvider = provider
              .replace(/-oauth2$/, '')
              .replace(/^windowslive$/, 'microsoft')
              .replace(/^twitter$/, 'x')
              .toLowerCase()
            userEmail = `${normalizedProvider}-${id}@lostcampstudios.local`
          } else {
            // Fallback if format is unexpected
            userEmail = `user-${userId.replace(/[^a-zA-Z0-9]/g, '-')}@lostcampstudios.local`
          }
          console.warn('No email found, using generated placeholder:', userEmail)
        }

        try {
          // Extract name - try multiple sources
          let userName = user.name
          
          // Check ID token claims for name fields (Apple often provides name here)
          if (!userName && idTokenClaims) {
            userName = idTokenClaims.name ||
                      idTokenClaims['https://lostcampstudios.com/name'] ||
                      (idTokenClaims as any).https?.name
            if (userName) {
              console.log('Got name from ID token claims:', userName)
            }
          }
          
          // Check for given_name/family_name (common in Apple ID)
          // Check both user object and ID token claims
          if (!userName) {
            const givenName = (user as any).given_name || (idTokenClaims as any)?.given_name
            const familyName = (user as any).family_name || (idTokenClaims as any)?.family_name
            if (givenName || familyName) {
              userName = `${givenName || ''} ${familyName || ''}`.trim() || undefined
              if (userName) {
                console.log('Got name from given_name/family_name:', userName, { givenName, familyName })
              }
            }
          }
          
          if (!userName) {
            const userAny = user as any
            userName = user.nickname || 
                      (idTokenClaims as any)?.nickname ||
                      (idTokenClaims as any)?.preferred_username ||
                      userAny.user_metadata?.name_from_claims ||
                      userAny.user_metadata?.name ||
                      userAny.app_metadata?.name ||
                      undefined
            if (userName) {
              console.log('Got name from nickname/preferred_username or metadata:', userName)
            }
          }
          
          // Sync user to backend
          console.log('=== EXTRACTION RESULTS ===')
          console.log('Extracted email:', userEmail)
          console.log('Extracted name:', userName)
          console.log('Email source:', userEmail === user.email ? 'user.email' : 
                     userEmail && idTokenClaims?.email ? 'idTokenClaims.email' :
                     userEmail && (user as any).user_metadata?.email ? 'user_metadata.email' :
                     userEmail?.includes('@lostcampstudios.local') ? 'GENERATED PLACEHOLDER' : 'OTHER')
          console.log('Name source:', userName === user.name ? 'user.name' :
                     userName && idTokenClaims?.name ? 'idTokenClaims.name' :
                     userName && ((user as any).given_name || (user as any).family_name) ? 'given_name/family_name' : 'OTHER')
          console.log('Syncing user to backend:', {
            id: userId,
            email: userEmail,
            name: userName,
            picture: user.picture || undefined,
          })
          console.log('=== USER SYNC DEBUG END ===')
          
          await usersApi.createOrUpdate({
            id: userId,
            email: userEmail,
            name: userName,
            picture: user.picture || undefined,
            bio: undefined,
          })
          
          console.log('User synced successfully')
        } catch (error) {
          console.error('Error syncing user:', error)
          // Log the full error for debugging
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
            })
          }
          // Don't block navigation on sync error, but log it
        }
        navigate('/')
      } else if (!isLoading && !isAuthenticated) {
        navigate('/login')
      }
    }

    syncUser()
  }, [isAuthenticated, isLoading, user, navigate, tokenReady])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Completing login...</div>
    </div>
  )
}

export default Callback

