import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useIsAdmin } from '../utils/admin'
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
  const [imageError, setImageError] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth0()
  const isAdmin = useIsAdmin()
  // const navigate = useNavigate() // Reserved for future use

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
        {user.picture && !imageError ? (
          <img 
            src={user.picture} 
            alt={user.name || user.email} 
            className="profile-avatar"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="profile-avatar-placeholder">
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-user-info">
              {user.picture && !imageError ? (
                <img 
                  src={user.picture} 
                  alt={user.name || user.email} 
                  className="dropdown-avatar"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="dropdown-avatar-placeholder">
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
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
            <span className="dropdown-icon profile-icon"></span>
            <span>View Profile</span>
          </Link>

          <Link
            to="/my-albums"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon library-icon"></span>
            <span>My Albums</span>
          </Link>

          <Link
            to="/my-favorites"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon heart-icon"></span>
            <span>My Favorites</span>
          </Link>

          <div className="dropdown-divider"></div>

          <Link
            to="/settings"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon settings-icon"></span>
            <span>Settings</span>
          </Link>

          {isAdmin && (
            <>
              <div className="dropdown-divider"></div>
              <Link
                to="/admin"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <span className="dropdown-icon admin-icon"></span>
                <span>Admin Panel</span>
              </Link>
            </>
          )}

          <div className="dropdown-divider"></div>

          <button
            className="dropdown-item logout-item"
            onClick={handleLogout}
          >
            <span className="dropdown-icon logout-icon"></span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileDropdown

