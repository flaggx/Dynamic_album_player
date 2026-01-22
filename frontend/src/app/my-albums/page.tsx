'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import MyAlbums from '@/views/MyAlbums'

export default function Page() {
  return (
    <ProtectedRoute>
      <MyAlbums />
    </ProtectedRoute>
  )
}
