import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth, type AppUser } from '../contexts/AuthContext'
import { useIsAdmin } from '../utils/admin'
import { premiumApi } from '../services/api'
import { PremiumStatus } from '../types'
import './ProfileDropdown.css'

interface ProfileDropdownProps {
  user: AppUser
}

const ProfileDropdown = ({ user }: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()
  const isAdmin = useIsAdmin()
  useEffect(() => {
    const loadPremiumStatus = async () => {
      if (!user.sub) return
      try {
        const status = await premiumApi.getStatus()
        setPremiumStatus(status)
      } catch (error) {
        console.error('Error loading premium status:', error)
      }
    }
    loadPremiumStatus()
  }, [user])

  // Helper function to get display name with fallbacks
  const getDisplayName = (): string => {
    if (user.name) return user.name
    if (user.email) {
      const emailName = user.email.split('@')[0]
      return emailName.charAt(0).toUpperCase() + emailName.slice(1)
    }
    return 'User'
  }

  const displayName = getDisplayName()

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
    void logout()
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
                <div className="dropdown-user-name">
                  {displayName}
                  {premiumStatus?.isPremium && (
                    <span className="premium-badge-small">Premium</span>
                  )}
                </div>
                <div className="dropdown-user-email">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <Link
            href="/profile"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon profile-icon"></span>
            <span>View Profile</span>
          </Link>

          <Link
            href="/my-albums"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon library-icon"></span>
            <span>My Albums</span>
          </Link>

          <Link
            href="/my-favorites"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon heart-icon"></span>
            <span>My Favorites</span>
          </Link>

          <div className="dropdown-divider"></div>

          <Link
            href="/premium"
            className="dropdown-item"
            onClick={() => setIsOpen(false)}
          >
            <span className="dropdown-icon premium-icon"></span>
            <span>{premiumStatus?.isPremium ? 'Manage Premium' : 'Upgrade to Premium'}</span>
          </Link>

          <Link
            href="/settings"
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
                href="/admin"
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

