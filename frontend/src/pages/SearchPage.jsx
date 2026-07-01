import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { searchApartments } from '../services/api'
import ApartmentCard from '../components/ApartmentCard'
import SearchFilters from '../components/SearchFilters'

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.045, ease: 'easeOut' },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

const SearchPage = () => {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState({})
  const [searched, setSearched] = useState(false)
  const PAGE_SIZE = 12

  useEffect(() => {
    fetchApartments({}, 1)
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
    setSearched(true)
    fetchApartments(filters, 1)
  }

  const handlePageChange = (newPage) => {
    fetchApartments(activeFilters, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* Hero header */}
      <div className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-10 pt-14 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="font-display text-[13px] font-medium tracking-[0.2em] uppercase text-primary-600 block mb-4">
              Catálogo completo
            </span>
            <h1
              className="font-display font-bold text-ink tracking-tight leading-none mb-3"
              style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}
            >
              Encontrá tu departamento
            </h1>
            <p className="text-ink-soft text-base max-w-md">
              Seleccioná capacidad y fechas para ver los departamentos disponibles para vos.
            </p>
          </motion.div>

          <div className="mt-8">
            <SearchFilters onSearch={handleSearch} loading={loading} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-10 py-10">

        {/* Counter */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`${total}-${loading}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-muted mb-8"
          >
            {loading
              ? 'Buscando…'
              : searched
                ? `${total} departamento${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''} para tus fechas`
                : `${total} departamento${total !== 1 ? 's' : ''} en el catálogo`
            }
          </motion.p>
        </AnimatePresence>

        {/* Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-muted">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"
            />
            <span className="text-sm">Buscando...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && apartments.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-full border border-hairline bg-[#efece6] flex items-center justify-center mx-auto mb-6">
              <Search className="w-7 h-7 text-muted" />
            </div>
            <p className="font-display text-xl font-bold text-ink mb-2">Sin resultados</p>
            <p className="text-muted text-sm">
              {searched
                ? 'No hay departamentos disponibles para esas fechas o capacidad. Probá con otros parámetros.'
                : 'No se encontraron departamentos en el catálogo.'}
            </p>
          </motion.div>
        )}

        {/* Cards grid */}
        {!loading && apartments.length > 0 && (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {apartments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <ApartmentCard apartment={apt} index={index} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-12 flex justify-center items-center gap-2"
              >
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-full border border-hairline text-sm font-medium disabled:opacity-40 hover:border-ink transition-colors duration-150"
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
                      <span key={`e-${idx}`} className="px-2 text-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors duration-150 ${
                          p === page
                            ? 'bg-ink text-paper border-ink'
                            : 'border-hairline hover:border-ink'
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
                  className="px-4 py-2 rounded-full border border-hairline text-sm font-medium disabled:opacity-40 hover:border-ink transition-colors duration-150"
                >
                  Siguiente
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SearchPage
