// Temporary test component to verify React is working
export default function TestApp() {
  return (
    <div style={{
      padding: '2rem',
      background: 'red',
      color: 'white',
      fontSize: '2rem',
      minHeight: '100vh'
    }}>
      <h1>TEST: If you see this, React is working!</h1>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  )
}

