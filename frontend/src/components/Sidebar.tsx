import { Link, useLocation } from 'react-router-dom'
import './Sidebar.css'

const Sidebar = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">
          <span className="logo-icon"></span>
          <span className="logo-text">Lost Camp Studios</span>
        </div>

        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`nav-item ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">⌂</span>
            <span className="nav-text">Home</span>
          </Link>

          <Link 
            to="/discover" 
            className={`nav-item ${isActive('/discover') ? 'active' : ''}`}
          >
            <span className="nav-icon search-icon"></span>
            <span className="nav-text">Search</span>
          </Link>

          <Link 
            to="/my-albums" 
            className={`nav-item ${isActive('/my-albums') ? 'active' : ''}`}
          >
            <span className="nav-icon library-icon"></span>
            <span className="nav-text">Your Library</span>
          </Link>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <Link to="/create-album" className="create-playlist-btn">
              <span className="nav-icon">+</span>
              <span className="nav-text">Create Album</span>
            </Link>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="section-title">Your Playlists</span>
          </div>
          <Link to="/my-favorites" className="nav-item">
            <span className="nav-icon heart-icon"></span>
            <span className="nav-text">Liked Songs</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Sidebar

