import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../Notification/LoadingSpinner'

const AdminRoute = () => {
  const { isAdmin, loading } = useAuth()

  if (loading) return <LoadingSpinner fullPage />
  if (!isAdmin) return <Navigate to="/admin/login" replace />
  return <Outlet />
}

export default AdminRoute
