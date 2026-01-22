'use client'

import PublicRoute from '@/components/PublicRoute'
import Discover from '@/views/Discover'

export default function Page() {
  return (
    <PublicRoute>
      <Discover />
    </PublicRoute>
  )
}
