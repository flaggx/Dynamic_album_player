import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileDropdown from './ProfileDropdown'
import { useAuth0 } from '@auth0/auth0-react'
import { useSidebar } from '../contexts/SidebarContext'
import './TopBar.css'

const TopBar = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loginWithRedirect } = useAuth0()
  const { toggleSidebar } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogin = () => {
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname,
      },
    })
  }

  const handleBack = () => {
    navigate(-1)
  }

  const handleForward = () => {
    navigate(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/discover?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button 
          className="nav-button hamburger-menu"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <button 
          className="nav-button prev" 
          onClick={handleBack}
          aria-label="Go back"
        >
          ‹
        </button>
        <button 
          className="nav-button next" 
          onClick={handleForward}
          aria-label="Go forward"
        >
          ›
        </button>
      </div>
      <div className="top-bar-center">
        <form onSubmit={handleSearch} className="top-bar-search-form">
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={handleSearchChange}
            className="top-bar-search-input"
          />
        </form>
      </div>
      <div className="top-bar-right">
        {isAuthenticated && user ? (
          <ProfileDropdown user={user} />
        ) : (
          <button className="login-button" onClick={handleLogin}>
            Log in
          </button>
        )}
      </div>
    </div>
  )
}

export default TopBar

