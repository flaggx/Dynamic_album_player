import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem',
        color: '#fff',
      }}
    >
      <h1 style={{ fontSize: '2rem' }}>Page not found</h1>
      <Link href="/" style={{ color: '#1db954' }}>
        Go home
      </Link>
    </div>
  )
}
