'use client'

import PublicRoute from '@/components/PublicRoute'
import Profile from '@/views/Profile'

export default function Page() {
  return (
    <PublicRoute>
      <Profile />
    </PublicRoute>
  )
}
