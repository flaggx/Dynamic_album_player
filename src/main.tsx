import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Debug: Check if root element exists
const rootElement = document.getElementById('root')
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 2rem; color: red; background: yellow;"><h1>Error: Root element not found</h1></div>'
  throw new Error('Root element not found')
}

console.log('main.tsx: Starting app render')

try {
  const root = ReactDOM.createRoot(rootElement)
  console.log('main.tsx: Root created, rendering App')
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('main.tsx: App rendered successfully')
} catch (error) {
  console.error('Error rendering app:', error)
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: red; background: yellow; min-height: 100vh;">
      <h1>Error Loading App</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <pre style="background: #f0f0f0; padding: 1rem; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `
}

