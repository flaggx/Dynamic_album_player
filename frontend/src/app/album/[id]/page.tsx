'use client'

import PublicRoute from '@/components/PublicRoute'
import AlbumDetail from '@/views/AlbumDetail'

export default function Page() {
  return (
    <PublicRoute>
      <AlbumDetail />
    </PublicRoute>
  )
}
