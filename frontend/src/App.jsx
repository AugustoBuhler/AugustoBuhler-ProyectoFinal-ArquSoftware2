import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from './pages/HomePage'
import ApartmentDetailPage from './pages/ApartmentDetailPage'
import BookingPage from './pages/BookingPage'
import ConfirmationPage from './pages/ConfirmationPage'
import SearchPage from './pages/SearchPage'
import BookingStatusPage from './pages/BookingStatusPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Footer from './components/Footer'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function App() {
  return (
    <Router>
      <ScrollToTop />
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
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-sky-50">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/apartment/:id" element={<ApartmentDetailPage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/booking/:id" element={<BookingPage />} />
                  <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
                  <Route path="/booking-status" element={<BookingStatusPage />} />
                </Routes>
              </main>
              <Footer />
            </div>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

