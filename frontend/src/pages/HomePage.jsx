import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Star, Shield, Clock } from 'lucide-react'
import { getApartmentTypes } from '../services/apartmentTypes'
import ApartmentTypeCard from '../components/ApartmentTypeCard'

const BUILDING_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=85'

const FEATURES = [
  { icon: Search, title: 'Búsqueda fácil', desc: 'Filtrá por fechas, precio y capacidad en segundos.' },
  { icon: Star, title: 'Calidad garantizada', desc: 'Departamentos amoblados, luminosos y modernos.' },
  { icon: Shield, title: 'Reserva segura', desc: 'Proceso 100% digital, sin intermediarios.' },
  { icon: Clock, title: 'Check-in ágil', desc: 'Confirmación inmediata y gestión online.' },
]

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
      const data = await getApartmentTypes()
      setTypes(data || [])
    } catch (err) {
      setError('Error al cargar los tipos de apartamentos. Por favor, intentá de nuevo.')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[560px] md:h-[640px] overflow-hidden">
        <img
          src={BUILDING_IMAGE}
          alt="Edificio de apartamentos"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/75 via-gray-900/55 to-primary-900/60" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm tracking-[0.3em] uppercase text-primary-300 mb-4 font-medium"
          >
            Tu espacio lejos de casa
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight max-w-3xl"
          >
            Departamentos premium para cada viaje
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-gray-200 max-w-xl mb-10"
          >
            Amoblados, luminosos y modernos. Reservá en pocos pasos, ya sea por trabajo o turismo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              <Search className="w-5 h-5" />
              Buscar departamento
            </Link>
            <a
              href="#tipos"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-4 rounded-xl border border-white/30 backdrop-blur-sm transition-colors text-lg"
            >
              Ver tipos de habitación
            </a>
          </motion.div>
        </div>
      </div>

      {/* Features strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.5 }}
                className="flex flex-col items-center text-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-1">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-snug">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Apartment types */}
      <div id="tipos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="text-sm tracking-[0.25em] uppercase text-primary-500 mb-3">
            Encontrá tu espacio
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Tipos de habitación
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Desde habitaciones dobles hasta cuádruples, con todo lo que necesitás para sentirte como en casa.
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center"
          >
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <button onClick={loadApartmentTypes} className="mt-2 text-red-700 underline">
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
            <p className="text-gray-500 mb-4">No se encontraron tipos de apartamentos disponibles</p>
            <button onClick={loadApartmentTypes} className="btn-primary">
              Reintentar
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {types.map((type, index) => (
              <ApartmentTypeCard key={type.type} type={type} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* CTA Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-700 to-primary-500 py-16">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            ¿Listo para reservar?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-primary-100 text-lg mb-8"
          >
            Explorá todos los departamentos disponibles y encontrá el que mejor se adapta a vos.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-white text-primary-700 hover:bg-primary-50 font-bold px-10 py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              <Search className="w-5 h-5" />
              Ver todos los departamentos
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
