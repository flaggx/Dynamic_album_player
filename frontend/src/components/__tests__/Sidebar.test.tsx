import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  it('should render navigation links', () => {
    render(<Sidebar />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Your Library')).toBeInTheDocument()
  })

  it('should have correct href attributes', () => {
    render(<Sidebar />)
    
    const homeLink = screen.getByText('Home').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
    
    const searchLink = screen.getByText('Search').closest('a')
    expect(searchLink).toHaveAttribute('href', '/discover')
  })
})

