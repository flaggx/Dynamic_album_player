import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import './Settings.css'

const Settings = () => {
  const { user } = useAuth0()
  const [notifications, setNotifications] = useState({
    email: true,
    newAlbums: true,
    likes: true,
  })

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="spotify-app">
      <Sidebar />
      <div className="main-content">
        <TopBar />

        <div className="content-area">
          <div className="settings-container">
        <h1>Settings</h1>

        <div className="settings-section">
          <h2>Account</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Email</label>
              <p className="settings-value">{user?.email || 'Not available'}</p>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Name</label>
              <p className="settings-value">{user?.name || 'Not set'}</p>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>User ID</label>
              <p className="settings-value settings-value-small">{user?.sub || 'Not available'}</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Notifications</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Email Notifications</label>
              <p className="settings-description">Receive email updates about your account</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => handleNotificationChange('email')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>New Albums from Subscriptions</label>
              <p className="settings-description">Get notified when artists you follow release new albums</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.newAlbums}
                onChange={() => handleNotificationChange('newAlbums')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Likes and Favorites</label>
              <p className="settings-description">Get notified when someone likes or favorites your songs</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.likes}
                onChange={() => handleNotificationChange('likes')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Privacy</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Profile Visibility</label>
              <p className="settings-description">Control who can see your profile and albums</p>
            </div>
            <select className="settings-select" defaultValue="public">
              <option value="public">Public</option>
              <option value="followers">Followers Only</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Data</h2>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Export Data</label>
              <p className="settings-description">Download a copy of your data</p>
            </div>
            <button className="settings-button secondary">Export</button>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <label>Clear Local Data</label>
              <p className="settings-description">Clear all locally stored data (albums, favorites, etc.)</p>
            </div>
            <button
              className="settings-button danger"
              onClick={() => {
                if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
            >
              Clear Data
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <p className="settings-note">
            💡 Note: Some settings are managed through your Auth0 account. 
            Visit your Auth0 dashboard to update email, password, and other account details.
          </p>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

