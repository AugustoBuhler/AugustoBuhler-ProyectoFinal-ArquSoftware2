import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Users, Bed, Bath, DollarSign, ArrowLeft, Calendar } from 'lucide-react'
import { getApartmentById } from '../services/api'

const ApartmentDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadApartment = async () => {
      setLoading(true)
      try {
        const data = await getApartmentById(id)
        setApartment(data)
      } catch (err) {
        setError('Error al cargar el apartamento')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadApartment()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (error || !apartment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Apartamento no encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Galería principal */}
        <div className="relative bg-gray-100">
          <div className="h-80 md:h-96">
            {apartment.images && apartment.images.length > 0 ? (
              <img
                src={apartment.images[0]}
                alt={apartment.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-8xl">
                🏠
              </div>
            )}
          </div>
          {apartment.available && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow">
              Disponible
            </div>
          )}
          {/* Thumbnails */}
          {apartment.images && apartment.images.length > 1 && (
            <div className="hidden md:flex gap-3 p-4 bg-white/80 backdrop-blur border-t border-gray-100">
              {apartment.images.slice(1, 4).map((img, idx) => (
                <div
                  key={idx}
                  className="h-20 w-32 rounded-lg overflow-hidden border border-gray-200"
                >
                  <img src={img} alt={`${apartment.name} ${idx + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                {apartment.name}
              </h1>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="text-lg">{apartment.address}, {apartment.city}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-baseline">
                <DollarSign className="w-6 h-6 text-primary-600" />
                <span className="text-4xl font-bold text-primary-600">
                  {apartment.price_per_night}
                </span>
                <span className="text-gray-500 ml-1">/noche</span>
              </div>
            </div>
          </div>

          <p className="text-gray-700 text-lg mb-8 leading-relaxed">
            {apartment.description}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Capacidad</p>
              <p className="text-2xl font-bold text-gray-800">{apartment.max_guests}</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <Bed className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Habitaciones</p>
              <p className="text-2xl font-bold text-gray-800">{apartment.bedrooms}</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <Bath className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Baños</p>
              <p className="text-2xl font-bold text-gray-800">{apartment.bathrooms}</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <DollarSign className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Precio/noche</p>
              <p className="text-2xl font-bold text-gray-800">${apartment.price_per_night}</p>
            </div>
          </div>

          {apartment.amenities && apartment.amenities.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Comodidades</h2>
              <div className="flex flex-wrap gap-3">
                {apartment.amenities.map((amenity, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-primary-100 text-primary-700 px-4 py-2 rounded-lg font-semibold"
                  >
                    {amenity}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <Link
              to={`/booking/${apartment.id}`}
              className="btn-primary text-lg px-8 py-4 flex items-center"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Reservar Ahora
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default ApartmentDetailPage

