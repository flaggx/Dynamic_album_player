import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import './ProfileDropdown.css'

interface ProfileDropdownProps {
  user: {
    picture?: string
    name?: string
    email?: string
  }
}

const ProfileDropdown = ({ user }: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth0()
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Profile menu"
      >
        {user.picture ? (
          <img src={user.picture} alt={user.name || user.email} className="profile-avatar" />
        ) : (
          <div className="profile-avatar-placeholder">
            {user.name?.[0] || user.email?.[0] || 'U'}
          </div>
        )}
        <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-user-info">
              {user.picture ? (
                <img src={user.picture} alt={user.name || user.email} className="dropdown-avatar" />
              ) : (
                <div className="dropdown-avatar-placeholder">
                  {user.name?.[0] || user.email?.[0] || 'U'}
                </div>
              )}
              <div className="dropdown-user-details">
                <div className="dropdown-user-name">{user.name || 'User'}</div>
                <div className="dropdown-user-email">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <Link
            to="/profile"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon">👤</span>
            <span>View Profile</span>
          </Link>

          <Link
            to="/my-albums"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon">🎵</span>
            <span>My Albums</span>
          </Link>

          <Link
            to="/my-favorites"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon">⭐</span>
            <span>My Favorites</span>
          </Link>

          <div className="dropdown-divider"></div>

          <Link
            to="/settings"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon">⚙️</span>
            <span>Settings</span>
          </Link>

          <div className="dropdown-divider"></div>

          <button
            className="dropdown-item logout-item"
            onClick={handleLogout}
          >
            <span className="dropdown-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileDropdown

