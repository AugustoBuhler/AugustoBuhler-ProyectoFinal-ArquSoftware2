import { Navigate } from 'react-router-dom'
import { isAdmin } from '../services/auth'

const ProtectedRoute = ({ children }) => {
  if (!isAdmin()) {
    return <Navigate to="/admin/login" replace />
  }
  return children
}

export default ProtectedRoute

