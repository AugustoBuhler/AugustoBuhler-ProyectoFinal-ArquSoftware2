import { NavLink, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, Settings, ClipboardList } from 'lucide-react'

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/90 backdrop-blur shadow-sm sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Home className="w-6 h-6 text-primary-600" />
            </motion.div>
            <span className="text-xl font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
              Apartamentos Temporales
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline">Inicio</span>
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              Departamentos
            </NavLink>
            <NavLink
              to="/booking-status"
              className={({ isActive }) =>
                `flex items-center space-x-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                }`
              }
            >
              <ClipboardList className="w-4 h-4" />
              <span>Mi Reserva</span>
            </NavLink>
            <NavLink
              to="/admin/login"
              className={({ isActive }) =>
                `flex items-center space-x-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">Admin</span>
            </NavLink>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar

