import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import TopBar from '../TopBar'
import { useNavigate } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

describe('TopBar', () => {
  it('should render navigation buttons', () => {
    const mockNavigate = vi.fn()
    ;(useNavigate as any).mockReturnValue(mockNavigate)

    render(<TopBar />)
    
    const backButton = screen.getByLabelText(/back/i)
    const forwardButton = screen.getByLabelText(/forward/i)
    
    expect(backButton).toBeInTheDocument()
    expect(forwardButton).toBeInTheDocument()
  })

  it('should navigate back when back button is clicked', () => {
    const mockNavigate = vi.fn()
    ;(useNavigate as any).mockReturnValue(mockNavigate)

    render(<TopBar />)
    
    const backButton = screen.getByLabelText(/back/i)
    backButton.click()

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('should navigate forward when forward button is clicked', () => {
    const mockNavigate = vi.fn()
    ;(useNavigate as any).mockReturnValue(mockNavigate)

    render(<TopBar />)
    
    const forwardButton = screen.getByLabelText(/forward/i)
    forwardButton.click()

    expect(mockNavigate).toHaveBeenCalledWith(1)
  })
})

