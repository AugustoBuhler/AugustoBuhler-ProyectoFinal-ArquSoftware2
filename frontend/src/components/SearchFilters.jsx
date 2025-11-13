import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, MapPin, Users, DollarSign, Calendar } from 'lucide-react'

const SearchFilters = ({ onSearch, loading }) => {
  const [filters, setFilters] = useState({
    q: '',
    city: '',
    capacity: '',
    min_price: '',
    max_price: '',
    check_in: '',
    check_out: '',
  })

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    })
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl p-6 mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            name="q"
            value={filters.q}
            onChange={handleChange}
            placeholder="Buscar por nombre..."
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="Ciudad"
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="number"
            name="capacity"
            value={filters.capacity}
            onChange={handleChange}
            placeholder="Capacidad mínima"
            min="1"
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="number"
            name="min_price"
            value={filters.min_price}
            onChange={handleChange}
            placeholder="Precio mínimo"
            min="0"
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="number"
            name="max_price"
            value={filters.max_price}
            onChange={handleChange}
            placeholder="Precio máximo"
            min="0"
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            name="check_in"
            value={filters.check_in}
            onChange={handleChange}
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            name="check_out"
            value={filters.check_out}
            onChange={handleChange}
            min={filters.check_in}
            className="input-field pl-10"
          />
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="btn-primary col-span-full md:col-span-1 lg:col-span-1"
        >
          {loading ? 'Buscando...' : 'Buscar Apartamentos'}
        </motion.button>
      </div>
    </motion.form>
  )
}

export default SearchFilters

