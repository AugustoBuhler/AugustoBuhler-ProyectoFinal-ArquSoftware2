import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApartmentTypes } from '../services/apartmentTypes'
import ApartmentTypeCard from '../components/ApartmentTypeCard'

const HomePage = () => {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadApartmentTypes()
  }, [])

  const loadApartmentTypes = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Loading apartment types...')
      const data = await getApartmentTypes()
      console.log('Apartment types loaded:', data)
      setTypes(data || [])
    } catch (err) {
      console.error('Error loading apartment types:', err)
      setError(`Error al cargar tipos de apartamentos: ${err.message || 'Verifica que Apartments-API esté corriendo en http://localhost:8081'}`)
      setTypes([])
    } finally {
      setLoading(false)
    }
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
          Elige tu Tipo de Habitación
        </h1>
        <p className="text-xl text-gray-600">
          Selecciona el tipo de habitación que mejor se adapte a tus necesidades
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
        >
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={loadApartmentTypes}
            className="mt-2 text-red-700 underline"
          >
            Reintentar
          </button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full"
          />
          <p className="ml-4 text-gray-600">Cargando tipos de apartamentos...</p>
        </div>
      ) : types.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-xl text-gray-600 mb-4">No hay tipos de apartamentos disponibles</p>
          <p className="text-gray-500 mb-4">Verifica que Apartments-API esté corriendo y tenga apartamentos</p>
          <button
            onClick={loadApartmentTypes}
            className="btn-primary"
          >
            Reintentar
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {types.map((type, index) => (
            <ApartmentTypeCard key={type.type} type={type} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HomePage
