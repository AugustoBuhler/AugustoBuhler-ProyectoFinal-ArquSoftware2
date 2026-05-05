import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { searchApartments } from '../services/api'
import ApartmentCard from '../components/ApartmentCard'
import SearchFilters from '../components/SearchFilters'

const SearchPage = () => {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState({})
  const PAGE_SIZE = 12

  useEffect(() => {
    fetchApartments(activeFilters, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchApartments = async (filters = {}, pageNum = 1) => {
    setLoading(true)
    try {
      const params = { ...filters, page: pageNum, size: PAGE_SIZE }
      const data = await searchApartments(params)
      setApartments(data.data || [])
      setTotal(data.total || 0)
      setPage(pageNum)
    } catch (_) {
      setApartments([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (filters) => {
    setActiveFilters(filters)
    fetchApartments(filters, 1)
  }

  const handlePageChange = (newPage) => {
    fetchApartments(activeFilters, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <p className="text-sm tracking-[0.25em] uppercase text-primary-500 mb-3">Catálogo completo</p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Buscar Departamentos</h1>
        <p className="text-lg text-gray-600">
          Filtrá por ciudad, precio, capacidad y fechas para encontrar tu alojamiento ideal.
        </p>
      </motion.div>

      <SearchFilters onSearch={handleSearch} />

      <div className="mt-8 flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {loading ? 'Buscando...' : `${total} departamento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
        </p>
      </div>

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
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No se encontraron departamentos</p>
          <p className="text-gray-500">Probá ajustando los filtros de búsqueda</p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apartments.map((apt, index) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ApartmentCard apartment={apt} />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )
              }
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SearchPage
