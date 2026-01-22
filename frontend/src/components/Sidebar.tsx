import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'
import './Sidebar.css'

const Sidebar = () => {
  const pathname = usePathname()
  const { isOpen, closeSidebar } = useSidebar()
  const { isAuthenticated } = useAuth()

  const isActive = (path: string) => pathname === path

  const songwritingActive =
    pathname === '/songwriting' || pathname.startsWith('/songwriting/')

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
              href="/"
              className={`nav-item ${isActive('/') ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">⌂</span>
              <span className="nav-text">Home</span>
            </Link>

            <Link
              href="/discover"
              className={`nav-item ${isActive('/discover') ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon search-icon"></span>
              <span className="nav-text">Search</span>
            </Link>

            {isAuthenticated && (
              <Link
                href="/my-albums"
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
                  <Link href="/create-album" className="create-playlist-btn" onClick={closeSidebar}>
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
                  href="/my-favorites"
                  className={`nav-item ${isActive('/my-favorites') ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <span className="nav-icon heart-icon"></span>
                  <span className="nav-text">Liked Songs</span>
                </Link>
              </div>
            </>
          )}

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="section-title">Premium</span>
            </div>
            <Link
              href="/songwriting"
              className={`nav-item ${songwritingActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon songwriting-icon"></span>
              <span className="nav-text">Songwriting Helper</span>
            </Link>
            {!isAuthenticated && (
              <Link
                href="/premium"
                className={`nav-item ${isActive('/premium') ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon premium-icon"></span>
                <span className="nav-text">Upgrade to Premium</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
