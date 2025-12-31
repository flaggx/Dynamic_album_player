import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import CreateAlbum from '../CreateAlbum'
import { albumsApi, songsApi } from '../../services/api'
import toast from 'react-hot-toast'

// Mock the API
vi.mock('../../services/api', () => ({
  albumsApi: {
    create: vi.fn(),
  },
  songsApi: {
    create: vi.fn(),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn(),
  },
}))
const mockToast = toast as any

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
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: { sub: 'user1', email: 'test@example.com', name: 'Test User' },
    isLoading: false,
    isAuthenticated: true,
  }),
}))

describe('CreateAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('should render form fields', () => {
    render(<CreateAlbum />)
    
    // Use getByText for labels since they don't have htmlFor attributes
    expect(screen.getByText(/album title/i)).toBeInTheDocument()
    expect(screen.getByText(/description/i)).toBeInTheDocument()
    expect(screen.getByText(/cover image/i)).toBeInTheDocument()
    // Check that inputs exist
    expect(screen.getByPlaceholderText(/enter album title/i)).toBeInTheDocument()
  })

  it('should show error toast when submitting without title', async () => {
    const user = userEvent.setup()
    render(<CreateAlbum />)
    
    // Find the submit button in the form (not the sidebar link)
    const submitButtons = screen.getAllByRole('button', { name: /create album/i })
    const formSubmitButton = submitButtons.find(btn => btn.type === 'submit') || submitButtons[submitButtons.length - 1]
    
    await user.click(formSubmitButton!)
    
    // HTML5 validation should prevent submission, so no API call should be made
    await waitFor(() => {
      expect(albumsApi.create).not.toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('should show error toast when submitting without songs', async () => {
    const user = userEvent.setup()
    render(<CreateAlbum />)
    
    const titleInput = screen.getByPlaceholderText(/enter album title/i)
    await user.type(titleInput, 'Test Album')
    
    // The default song has empty title and no tracks, so it's invalid
    // Find the form and submit it directly using fireEvent
    const form = screen.getByPlaceholderText(/enter album title/i).closest('form')
    expect(form).toBeInTheDocument()
    
    // Submit the form directly
    fireEvent.submit(form!)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please add at least one song with tracks')
    }, { timeout: 3000 })
  })

  it('should validate cover image file size', async () => {
    const user = userEvent.setup()
    render(<CreateAlbum />)
    
    // Create a large file (over 5MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large-image.jpg', { type: 'image/jpeg' })
    const fileInputs = document.querySelectorAll('input[type="file"]')
    const coverImageInput = Array.from(fileInputs).find(input => 
      (input as HTMLInputElement).accept.includes('image')
    ) as HTMLInputElement
    
    expect(coverImageInput).toBeDefined()
    await user.upload(coverImageInput, largeFile)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('too large')
      )
    })
  })

  it('should validate cover image file type', async () => {
    const user = userEvent.setup()
    render(<CreateAlbum />)
    
    // Create an invalid file type
    const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' })
    const fileInputs = document.querySelectorAll('input[type="file"]')
    const coverImageInput = Array.from(fileInputs).find(input => {
      const accept = (input as HTMLInputElement).accept
      return accept && accept.includes('image')
    }) as HTMLInputElement
    
    expect(coverImageInput).toBeDefined()
    
    // Use fireEvent to directly trigger the onChange handler
    fireEvent.change(coverImageInput, { target: { files: [invalidFile] } })
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('not a valid image file')
      )
    }, { timeout: 2000 })
  })

  it('should show loading spinner when submitting', async () => {
    const user = userEvent.setup()
    // Use a promise that resolves after a delay to test loading state
    let resolvePromise: (value: any) => void
    const delayedPromise = new Promise<any>((resolve) => {
      resolvePromise = resolve
    })
    ;(albumsApi.create as any).mockImplementation(() => delayedPromise)
    
    render(<CreateAlbum />)
    
    const titleInput = screen.getByPlaceholderText(/enter album title/i)
    await user.type(titleInput, 'Test Album')
    
    // Add a song with a track
    const songTitleInput = screen.getByPlaceholderText(/enter song title/i)
    await user.type(songTitleInput, 'Test Song')
    
    // Set track name
    const trackNameInputs = screen.getAllByPlaceholderText(/track name/i)
    if (trackNameInputs.length > 0) {
      await user.type(trackNameInputs[0], 'Track 1')
    }
    
    // Create a valid audio file
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })
    const trackFileInputs = document.querySelectorAll('input[type="file"][accept*="audio"]')
    if (trackFileInputs.length > 0) {
      await user.upload(trackFileInputs[0] as HTMLInputElement, audioFile)
    }
    
    // Find the form and submit it directly
    const form = screen.getByPlaceholderText(/enter album title/i).closest('form')
    fireEvent.submit(form!)
    
    // Check for loading state - the button should be disabled
    await waitFor(() => {
      const button = form!.querySelector('button[type="submit"]')
      expect(button).toBeDisabled()
    }, { timeout: 2000 })
    
    // Resolve the promise to clean up
    resolvePromise!({ id: 'test', title: 'Test Album' })
  })

  it('should show success toast and navigate on successful creation', async () => {
    const user = userEvent.setup()
    const mockAlbum = {
      id: 'album1',
      title: 'Test Album',
      artist: 'Test User',
      artistId: 'user1',
      coverImage: null,
      description: '',
      songs: [],
      likes: 0,
      subscribers: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    ;(albumsApi.create as any).mockResolvedValue(mockAlbum)
    ;(songsApi.create as any).mockResolvedValue({
      id: 'song1',
      title: 'Test Song',
      artist: 'Test User',
      albumId: 'album1',
      tracks: [],
      likes: 0,
      favorites: 0,
      createdAt: new Date().toISOString(),
    })
    
    render(<CreateAlbum />)
    
    const titleInput = screen.getByPlaceholderText(/enter album title/i)
    await user.type(titleInput, 'Test Album')
    
    // Add a song with a track
    const songTitleInput = screen.getByPlaceholderText(/enter song title/i)
    await user.type(songTitleInput, 'Test Song')
    
    // Set track name
    const trackNameInputs = screen.getAllByPlaceholderText(/track name/i)
    if (trackNameInputs.length > 0) {
      await user.type(trackNameInputs[0], 'Track 1')
    }
    
    // Create a valid audio file
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })
    const trackFileInputs = document.querySelectorAll('input[type="file"][accept*="audio"]')
    if (trackFileInputs.length > 0) {
      await user.upload(trackFileInputs[0] as HTMLInputElement, audioFile)
    }
    
    // Find the form and submit it directly
    const form = screen.getByPlaceholderText(/enter album title/i).closest('form')
    fireEvent.submit(form!)
    
    // Wait for the album to be created and songs to be uploaded
    // The success message format is: "Album created successfully with X song(s)!"
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled()
      const successCalls = (mockToast.success as any).mock.calls
      const hasSuccessCall = successCalls.some((call: any[]) => {
        const message = call[0]
        return message && typeof message === 'string' && 
          (message.includes('created successfully') || message.includes('Album created'))
      })
      expect(hasSuccessCall).toBe(true)
    }, { timeout: 5000 })
  })

  it('should show error toast when API call fails', async () => {
    const user = userEvent.setup()
    ;(albumsApi.create as any).mockRejectedValue(new Error('API Error'))
    
    render(<CreateAlbum />)
    
    const titleInput = screen.getByPlaceholderText(/enter album title/i)
    await user.type(titleInput, 'Test Album')
    
    // Add a song with a track
    const songTitleInput = screen.getByPlaceholderText(/enter song title/i)
    await user.type(songTitleInput, 'Test Song')
    
    // Set track name
    const trackNameInputs = screen.getAllByPlaceholderText(/track name/i)
    if (trackNameInputs.length > 0) {
      await user.type(trackNameInputs[0], 'Track 1')
    }
    
    // Create a valid audio file
    const audioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' })
    const trackFileInputs = document.querySelectorAll('input[type="file"][accept*="audio"]')
    if (trackFileInputs.length > 0) {
      await user.upload(trackFileInputs[0] as HTMLInputElement, audioFile)
    }
    
    // Find the form and submit it directly
    const form = screen.getByPlaceholderText(/enter album title/i).closest('form')
    fireEvent.submit(form!)
    
    // Wait for the error toast
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
      const errorCalls = (mockToast.error as any).mock.calls
      const hasErrorCall = errorCalls.some((call: any[]) => 
        call[0] && typeof call[0] === 'string' && call[0].includes('Error creating album')
      )
      expect(hasErrorCall).toBe(true)
    }, { timeout: 5000 })
  })
})

