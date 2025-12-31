import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import { PlayerProvider } from '../contexts/PlayerContext'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Auth0Provider
      domain="test-domain.auth0.com"
      clientId="test-client-id"
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PlayerProvider>
          {children}
        </PlayerProvider>
      </BrowserRouter>
    </Auth0Provider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

