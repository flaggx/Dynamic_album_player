import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useSidebar } from '../contexts/SidebarContext'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isOpen, closeSidebar } = useSidebar()
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  const isActive = (path: string) => location.pathname === path

  const handleProtectedLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    closeSidebar()
    if (!isAuthenticated) {
      loginWithRedirect({
        appState: {
          returnTo: path,
        },
      })
    } else {
      navigate(path)
    }
  }

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <span className="logo-icon"></span>
          <span className="logo-text">Lost Camp Studios</span>
        </div>

        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="nav-icon">⌂</span>
            <span className="nav-text">Home</span>
          </Link>

          <Link 
            to="/discover" 
            className={`nav-item ${isActive('/discover') ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="nav-icon search-icon"></span>
            <span className="nav-text">Search</span>
          </Link>

          {isAuthenticated && (
            <Link 
              to="/my-albums" 
              className={`nav-item ${isActive('/my-albums') ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon library-icon"></span>
              <span className="nav-text">Your Library</span>
            </Link>
          )}
        </nav>

        {isAuthenticated && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <Link to="/create-album" className="create-playlist-btn" onClick={closeSidebar}>
                  <span className="nav-icon">+</span>
                  <span className="nav-text">Create Album</span>
                </Link>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="section-title">Your Playlists</span>
              </div>
              <Link 
                to="/my-favorites" 
                className={`nav-item ${isActive('/my-favorites') ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon heart-icon"></span>
                <span className="nav-text">Liked Songs</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}

export default Sidebar

