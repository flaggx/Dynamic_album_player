'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import Premium from '@/views/Premium'

export default function Page() {
  return (
    <ProtectedRoute>
      <Premium />
    </ProtectedRoute>
  )
}
