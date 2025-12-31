import { useAuth0 } from '@auth0/auth0-react'
import AudioPlayer from '../components/AudioPlayer'
import './Home.css'

const Home = () => {
  const { user, logout } = useAuth0()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Dynamic Album Player</h1>
            <p>Toggle individual tracks to customize your listening experience</p>
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
        <AudioPlayer />
      </main>
    </div>
  )
}

export default Home

