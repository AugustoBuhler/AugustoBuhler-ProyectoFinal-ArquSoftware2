import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ApartmentDetailPage from './pages/ApartmentDetailPage'
import BookingPage from './pages/BookingPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/apartment/:id" element={<ApartmentDetailPage />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/booking/:id" element={<BookingPage />} />
                <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
              </Routes>
            </div>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

