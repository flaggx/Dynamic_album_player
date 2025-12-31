import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import MyAlbums from '../MyAlbums'
import { albumsApi } from '../../services/api'
import toast from 'react-hot-toast'

// Mock the API
vi.mock('../../services/api', () => ({
  albumsApi: {
    getByArtist: vi.fn(),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}))
const mockToast = toast as any

// Auth0 is already mocked globally in setup.ts, no need to mock here

describe('MyAlbums', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading spinner initially', async () => {
    // Use a promise that resolves after a short delay
    let resolvePromise: () => void
    const delayedPromise = new Promise<any>((resolve) => {
      resolvePromise = resolve
    })
    ;(albumsApi.getByArtist as any).mockImplementation(() => delayedPromise)
    
    render(<MyAlbums />)
    
    // Check spinner appears immediately
    await waitFor(() => {
      const spinner = document.querySelector('.loading-spinner')
      expect(spinner).toBeInTheDocument()
    }, { timeout: 1000 })
    
    // Resolve to clean up
    resolvePromise!()
    await delayedPromise.catch(() => {}) // Handle any errors
  })

  it('should display error toast when API call fails', async () => {
    const error = new Error('API Error')
    ;(albumsApi.getByArtist as any).mockRejectedValue(error)
    
    render(<MyAlbums />)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })
  })

    it('should display empty state when no albums', async () => {
      ;(albumsApi.getByArtist as any).mockResolvedValue([])
      
      render(<MyAlbums />)
      
      await waitFor(() => {
        // Wait for loading to complete first
        const spinner = document.querySelector('.loading-spinner')
        if (spinner) {
          throw new Error('Still loading')
        }
        // Check for empty state text
        const emptyState = screen.queryByText("You haven't created any albums yet.")
        if (!emptyState) {
          // Fallback: check for any text containing the key words
          const allText = document.body.textContent || ''
          const hasText = allText.includes("haven't") && allText.includes("created") && allText.includes("albums")
          if (!hasText) {
            throw new Error('Empty state text not found')
          }
        }
        expect(emptyState || document.body.textContent?.includes("haven't")).toBeTruthy()
      }, { timeout: 3000 })
    })

  it('should display albums after loading', async () => {
    const mockAlbums = [
      {
        id: 'album1',
        title: 'My Album',
        artist: 'Test Artist',
        artistId: 'user1',
        coverImage: null,
        description: '',
        songs: [],
        likes: 0,
        subscribers: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    ;(albumsApi.getByArtist as any).mockResolvedValue(mockAlbums)
    
    render(<MyAlbums />)
    
    await waitFor(() => {
      expect(screen.getByText('My Album')).toBeInTheDocument()
    })
  })
})

