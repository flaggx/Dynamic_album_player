'use client'

import PublicRoute from '@/components/PublicRoute'
import Home from '@/views/Home'

export default function Page() {
  return (
    <PublicRoute>
      <Home />
    </PublicRoute>
  )
}
