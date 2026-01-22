'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import EditAlbum from '@/views/EditAlbum'

export default function Page() {
  return (
    <ProtectedRoute>
      <EditAlbum />
    </ProtectedRoute>
  )
}
