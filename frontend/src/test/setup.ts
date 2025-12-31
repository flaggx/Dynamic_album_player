import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Suppress localStorage-file warnings from Node.js
const originalEmitWarning = process.emitWarning
process.emitWarning = function (warning, ...args) {
  if (typeof warning === 'string' && warning.includes('localstorage-file')) {
    return
  }
  return originalEmitWarning.call(process, warning, ...args)
}

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock AudioContext
global.AudioContext = class {
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 },
    }
  }
  createMediaElementSource() {
    return {
      connect: () => {},
    }
  }
  destination = {}
} as any

// Mock HTMLAudioElement
global.HTMLAudioElement = class {
  play() {
    return Promise.resolve()
  }
  pause() {
    return Promise.resolve()
  }
  load() {
    return Promise.resolve()
  }
  addEventListener() {}
  removeEventListener() {}
  currentTime = 0
  duration = 0
  paused = true
  src = ''
} as any
