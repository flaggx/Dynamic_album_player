import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '../test/mocks/auth0'
import { PlayerProvider } from '../contexts/PlayerContext'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Auth0Provider>
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

