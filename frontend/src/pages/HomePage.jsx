import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { searchApartments } from '../services/api'
import SearchFilters from '../components/SearchFilters'
import ApartmentCard from '../components/ApartmentCard'

const HomePage = () => {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 12,
    total: 0,
    totalPages: 0,
  })

  const loadApartments = async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        ...filters,
        page: pagination.page,
        size: pagination.size,
      }
      const response = await searchApartments(params)
      setApartments(response.data || [])
      setPagination({
        page: response.page || 1,
        size: response.size || 12,
        total: response.total || 0,
        totalPages: response.total_pages || 0,
      })
    } catch (err) {
      console.error('Error loading apartments:', err)
      setError('Error al cargar apartamentos. Verifica que Search-API esté corriendo.')
      setApartments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApartments()
  }, [])

  const handleSearch = (filters) => {
    setPagination({ ...pagination, page: 1 })
    loadApartments(filters)
  }

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage })
    const currentFilters = {}
    loadApartments(currentFilters)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Encuentra tu Apartamento Ideal
        </h1>
        <p className="text-xl text-gray-600">
          Descubre alojamientos temporales perfectos para tu estancia
        </p>
      </motion.div>

      <SearchFilters onSearch={handleSearch} loading={loading} />

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
        >
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full"
          />
        </div>
      ) : apartments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-xl text-gray-600 mb-4">No se encontraron apartamentos</p>
          <p className="text-gray-500">Intenta ajustar los filtros de búsqueda</p>
        </motion.div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-600">
              Mostrando {apartments.length} de {pagination.total} apartamentos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {apartments.map((apartment, index) => (
              <ApartmentCard key={apartment.id} apartment={apartment} index={index} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </motion.button>
              <span className="px-4 py-2 text-gray-700">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default HomePage
