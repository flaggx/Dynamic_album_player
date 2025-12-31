import { useNavigate } from 'react-router-dom'
import ProfileDropdown from './ProfileDropdown'
import { useAuth0 } from '@auth0/auth0-react'
import './TopBar.css'

const TopBar = () => {
  const navigate = useNavigate()
  const { user } = useAuth0()

  const handleBack = () => {
    navigate(-1)
  }

  const handleForward = () => {
    navigate(1)
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
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
      <div className="top-bar-right">
        {user && <ProfileDropdown user={user} />}
      </div>
    </div>
  )
}

export default TopBar

