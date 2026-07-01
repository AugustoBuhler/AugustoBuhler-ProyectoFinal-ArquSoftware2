import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Calendar, Search } from 'lucide-react'

const SearchFilters = ({ onSearch, loading }) => {
  const [filters, setFilters] = useState({
    capacity: '',
    check_in: '',
    check_out: '',
  })

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    )
    onSearch(cleanFilters)
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      onSubmit={handleSubmit}
      className="w-full"
    >
      <div className="bg-[#efece6] border border-hairline p-6 sm:p-8" style={{ borderRadius: '4px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Capacidad */}
          <div className="flex flex-col gap-2">
            <label className="font-display text-[12px] font-medium tracking-[0.14em] uppercase text-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Personas
            </label>
            <div className="relative">
              <input
                type="number"
                name="capacity"
                value={filters.capacity}
                onChange={handleChange}
                placeholder="¿Cuántos?"
                min="1"
                max="10"
                className="w-full bg-paper border border-hairline focus:border-ink outline-none px-5 py-3.5 text-ink placeholder-muted transition-colors duration-150 rounded-full text-[15px]"
              />
            </div>
          </div>

          {/* Check-in */}
          <div className="flex flex-col gap-2">
            <label className="font-display text-[12px] font-medium tracking-[0.14em] uppercase text-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Entrada
            </label>
            <input
              type="date"
              name="check_in"
              value={filters.check_in}
              onChange={handleChange}
              className="w-full bg-paper border border-hairline focus:border-ink outline-none px-5 py-3.5 text-ink transition-colors duration-150 rounded-full text-[15px]"
            />
          </div>

          {/* Check-out */}
          <div className="flex flex-col gap-2">
            <label className="font-display text-[12px] font-medium tracking-[0.14em] uppercase text-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Salida
            </label>
            <input
              type="date"
              name="check_out"
              value={filters.check_out}
              onChange={handleChange}
              min={filters.check_in || undefined}
              className="w-full bg-paper border border-hairline focus:border-ink outline-none px-5 py-3.5 text-ink transition-colors duration-150 rounded-full text-[15px]"
            />
          </div>
        </div>

        {/* Botón */}
        <div className="mt-5 flex justify-end">
          <motion.button
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-paper font-display font-semibold text-[15px] px-8 py-3.5 rounded-full transition-all duration-150 disabled:opacity-60"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full"
                />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.form>
  )
}

export default SearchFilters
