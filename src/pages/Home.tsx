import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import './Home.css'

const Home = () => {
  const { user, logout } = useAuth0()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Dynamic Album Player</h1>
            <p>Create, discover, and play albums with customizable tracks</p>
          </div>
          <div className="user-menu">
            {user?.picture && (
              <img 
                src={user.picture} 
                alt={user.name || user.email} 
                className="user-avatar"
              />
            )}
            <span className="user-name">{user?.name || user?.email}</span>
            <button 
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} 
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <div className="home-content">
          <div className="home-cards">
            <Link to="/discover" className="home-card">
              <div className="card-icon">🔍</div>
              <h2>Discover Albums</h2>
              <p>Browse and explore albums created by other artists</p>
            </Link>
            <Link to="/create-album" className="home-card">
              <div className="card-icon">➕</div>
              <h2>Create Album</h2>
              <p>Upload your music and create interactive albums</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home

