import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { usersApi } from '../services/api'

function hasAdminRoleInMetadata(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false
  const roles = meta.roles
  const role = meta.role
  if (Array.isArray(roles)) {
    return roles.some(
      (r) =>
        typeof r === 'string' &&
        (r.toLowerCase() === 'admin' || r.toLowerCase() === 'administrator')
    )
  }
  if (typeof role === 'string') {
    return role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrator'
  }
  return false
}

export const useIsAdmin = (): boolean => {
  const { user, isAuthenticated } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) {
      setIsAdmin(false)
      return
    }

    if (hasAdminRoleInMetadata(user.app_metadata)) {
      setIsAdmin(true)
      return
    }

    let cancelled = false
    usersApi
      .getById(user.sub)
      .then((u) => {
        if (!cancelled) setIsAdmin(Boolean(u.isAdmin))
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, isAuthenticated])

  return isAdmin
}
