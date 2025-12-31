import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import Sidebar from '../components/Sidebar'
import ProfileDropdown from '../components/ProfileDropdown'
import './Home.css'

const Home = () => {
  const { user } = useAuth0()

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <button className="nav-button prev">‹</button>
            <button className="nav-button next">›</button>
          </div>
          <div className="top-bar-right">
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>

        <div className="content-area">
          <div className="greeting-section">
            <h1>Good evening</h1>
            <div className="quick-access-grid">
              <Link to="/discover" className="quick-access-card">
                <div className="card-icon">🔍</div>
                <span>Search</span>
              </Link>
              <Link to="/create-album" className="quick-access-card">
                <div className="card-icon">➕</div>
                <span>Create Album</span>
              </Link>
              <Link to="/my-albums" className="quick-access-card">
                <div className="card-icon">📚</div>
                <span>Your Library</span>
              </Link>
              <Link to="/my-favorites" className="quick-access-card">
                <div className="card-icon">⭐</div>
                <span>Liked Songs</span>
              </Link>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h2>Made for You</h2>
              <Link to="/discover" className="see-all-link">Show all</Link>
            </div>
            <div className="cards-grid">
              <Link to="/discover" className="feature-card">
                <div className="feature-card-image">
                  <span>🔍</span>
                </div>
                <div className="feature-card-title">Discover</div>
                <div className="feature-card-subtitle">Explore new albums</div>
              </Link>
              <Link to="/create-album" className="feature-card">
                <div className="feature-card-image">
                  <span>➕</span>
                </div>
                <div className="feature-card-title">Create</div>
                <div className="feature-card-subtitle">Upload your music</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

