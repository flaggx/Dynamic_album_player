import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileDropdown from './ProfileDropdown'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'
import './TopBar.css'

const TopBar = () => {
  const router = useRouter()
  const { user, isAuthenticated, loginWithRedirect } = useAuth()
  const { toggleSidebar } = useSidebar()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogin = () => {
    void loginWithRedirect()
  }

  const handleBack = () => {
    router.back()
  }

  const handleForward = () => {
    router.forward()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/discover?search=${encodeURIComponent(searchQuery.trim())}`)
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
          <button type="button" className="login-button" onClick={handleLogin}>
            Log in
          </button>
        )}
      </div>
    </div>
  )
}

export default TopBar
