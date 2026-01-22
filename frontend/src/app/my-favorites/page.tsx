'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import MyFavorites from '@/views/MyFavorites'

export default function Page() {
  return (
    <ProtectedRoute>
      <MyFavorites />
    </ProtectedRoute>
  )
}
