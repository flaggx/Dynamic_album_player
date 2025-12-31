import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  fullScreen?: boolean
}

const LoadingSpinner = ({ size = 'medium', fullScreen = false }: LoadingSpinnerProps) => {
  const spinner = (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner"></div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {spinner}
        <p>Loading...</p>
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner

