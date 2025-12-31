import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    render(<LoadingSpinner />)
    const spinner = document.querySelector('.loading-spinner')
    expect(spinner).toBeInTheDocument()
  })

  it('should render with small size', () => {
    render(<LoadingSpinner size="small" />)
    const spinner = document.querySelector('.loading-spinner.small')
    expect(spinner).toBeInTheDocument()
  })

  it('should render with medium size (default)', () => {
    render(<LoadingSpinner />)
    const spinner = document.querySelector('.loading-spinner.medium')
    expect(spinner).toBeInTheDocument()
  })

  it('should render with large size', () => {
    render(<LoadingSpinner size="large" />)
    const spinner = document.querySelector('.loading-spinner.large')
    expect(spinner).toBeInTheDocument()
  })

  it('should have spinner element', () => {
    render(<LoadingSpinner />)
    const spinnerElement = document.querySelector('.spinner')
    expect(spinnerElement).toBeInTheDocument()
  })
})

