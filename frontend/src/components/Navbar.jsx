import { NavLink, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const Navbar = () => {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 border-b border-hairline"
      style={{ background: 'color-mix(in oklab, #f7f5f2 88%, transparent)', backdropFilter: 'blur(12px)' }}
    >
      <nav className="max-w-6xl mx-auto px-10 h-[72px] flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center gap-2.5 group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="w-[9px] h-[9px] rounded-full bg-primary-600 flex-shrink-0" />
          <span className="font-display font-bold text-[19px] tracking-[0.04em] uppercase text-ink group-hover:text-primary-600 transition-colors duration-150">
            Docta Suites
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-[15px] font-medium transition-colors duration-150 ${isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'}`
            }
          >
            Departamentos
          </NavLink>
          <NavLink
            to="/booking-status"
            className={({ isActive }) =>
              `text-[15px] font-medium transition-colors duration-150 ${isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'}`
            }
          >
            Mi Reserva
          </NavLink>
          <NavLink
            to="/admin/login"
            className={({ isActive }) =>
              `text-[13px] font-semibold px-4 py-1.5 rounded-full border transition-colors duration-150 ${
                isActive
                  ? 'bg-ink text-paper border-ink'
                  : 'text-ink-soft border-hairline hover:border-ink hover:text-ink'
              }`
            }
          >
            Admin
          </NavLink>
        </div>
      </nav>
    </motion.header>
  )
}

export default Navbar
