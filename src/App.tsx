import AudioPlayer from './components/AudioPlayer'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Dynamic Album Player</h1>
        <p>Toggle individual tracks to customize your listening experience</p>
      </header>
      <main className="app-main">
        <AudioPlayer />
      </main>
    </div>
  )
}

export default App

