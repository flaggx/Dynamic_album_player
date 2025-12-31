import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import Home from '../Home'

describe('Home', () => {
  it('should render greeting', () => {
    render(<Home />)
    expect(screen.getByText('Good evening')).toBeInTheDocument()
  })

  it('should render quick access cards', () => {
    render(<Home />)
    
    // Check for quick access cards by finding the grid container
    const quickAccessGrid = document.querySelector('.quick-access-grid')
    expect(quickAccessGrid).toBeInTheDocument()
    
    // Check that all quick access cards are present
    const quickAccessCards = quickAccessGrid?.querySelectorAll('.quick-access-card')
    expect(quickAccessCards?.length).toBe(4)
    
    // Verify specific cards exist within the quick access grid by checking links
    const searchLink = quickAccessGrid?.querySelector('a[href="/discover"]')
    expect(searchLink).toBeInTheDocument()
    expect(searchLink?.textContent).toContain('Search')
    
    const createLink = quickAccessGrid?.querySelector('a[href="/create-album"]')
    expect(createLink).toBeInTheDocument()
    expect(createLink?.textContent).toContain('Create Album')
    
    const libraryLink = quickAccessGrid?.querySelector('a[href="/my-albums"]')
    expect(libraryLink).toBeInTheDocument()
    expect(libraryLink?.textContent).toContain('Your Library')
    
    const likedLink = quickAccessGrid?.querySelector('a[href="/my-favorites"]')
    expect(likedLink).toBeInTheDocument()
    expect(likedLink?.textContent).toContain('Liked Songs')
  })

  it('should have correct navigation links', () => {
    render(<Home />)
    
    // Find quick access links by their container
    const quickAccessGrid = document.querySelector('.quick-access-grid')
    const discoverLink = quickAccessGrid?.querySelector('a[href="/discover"]')
    expect(discoverLink).toBeInTheDocument()
    
    const createLink = quickAccessGrid?.querySelector('a[href="/create-album"]')
    expect(createLink).toBeInTheDocument()
    
    const libraryLink = quickAccessGrid?.querySelector('a[href="/my-albums"]')
    expect(libraryLink).toBeInTheDocument()
    
    const favoritesLink = quickAccessGrid?.querySelector('a[href="/my-favorites"]')
    expect(favoritesLink).toBeInTheDocument()
  })
})

