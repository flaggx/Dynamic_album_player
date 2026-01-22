'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import CreateAlbum from '@/views/CreateAlbum'

export default function Page() {
  return (
    <ProtectedRoute>
      <CreateAlbum />
    </ProtectedRoute>
  )
}
