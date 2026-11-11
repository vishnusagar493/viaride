import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.data.user)
    } catch {
      setUser(null)
    }
  }, [])

  const fetchAdmin = useCallback(async () => {
    try {
      const res = await api.get('/admin/auth/me')
      setAdmin(res.data.data.admin)
    } catch {
      setAdmin(null)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.allSettled([fetchUser(), fetchAdmin()])
      setLoading(false)
    }
    init()
  }, [fetchUser, fetchAdmin])

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    setUser(res.data.data.user)
    return res.data
  }

  const register = async (data) => {
    const res = await api.post('/auth/register', data)
    setUser(res.data.data.user)
    return res.data
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  const adminLogin = async (email, password) => {
    const res = await api.post('/admin/auth/login', { email, password })
    setAdmin(res.data.data.admin)
    return res.data
  }

  const adminLogout = async () => {
    await api.post('/admin/auth/logout')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{
      user, admin, loading,
      login, register, logout,
      adminLogin, adminLogout,
      isAuthenticated: !!user,
      isAdmin: !!admin,
      refreshUser: fetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
