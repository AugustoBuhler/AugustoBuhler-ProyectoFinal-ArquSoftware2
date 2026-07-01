import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Users, Bed, Bath, ArrowLeft, Calendar } from 'lucide-react'
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
      <div className="flex justify-center items-center min-h-screen gap-3 text-muted">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (error || !apartment) {
    return (
      <div className="max-w-6xl mx-auto px-10 py-8">
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
          {error || 'Apartamento no encontrado'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-10 py-10">
      <motion.button
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className="flex items-center text-ink-soft hover:text-primary-600 mb-8 transition-colors duration-150 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border border-hairline bg-paper overflow-hidden"
        style={{ borderRadius: '4px' }}
      >
        {/* Imagen principal */}
        <div className="relative bg-[#efece6]">
          <div className="h-80 md:h-[420px]">
            {apartment.images && apartment.images.length > 0 ? (
              <img
                src={apartment.images[0]}
                alt={apartment.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-6xl">
                ⬜
              </div>
            )}
          </div>
          {apartment.available && (
            <div className="absolute top-4 right-4 bg-paper text-ink text-xs font-semibold px-3 py-1.5 rounded-full border border-hairline">
              Disponible
            </div>
          )}
          {apartment.images && apartment.images.length > 1 && (
            <div className="hidden md:flex gap-3 p-4 bg-paper border-t border-hairline">
              {apartment.images.slice(1, 4).map((img, idx) => (
                <div key={idx} className="h-20 w-32 overflow-hidden border border-hairline" style={{ borderRadius: '4px' }}>
                  <img src={img} alt={`${apartment.name} ${idx + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-10">
          <div className="flex items-start justify-between mb-8 gap-6">
            <div>
              <h1 className="font-display text-[36px] font-bold text-ink tracking-tight leading-tight mb-2">
                {apartment.name}
              </h1>
              <div className="flex items-center text-ink-soft">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{apartment.address}, {apartment.city}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-display text-[36px] font-bold text-ink leading-none">
                ${apartment.price_per_night?.toLocaleString('es-AR')}
              </span>
              <span className="text-muted text-sm ml-1 block mt-1">/ noche</span>
            </div>
          </div>

          <p className="text-ink-soft text-lg mb-10 leading-relaxed max-w-prose">
            {apartment.description}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { Icon: Users, label: 'Capacidad', value: `${apartment.max_guests} personas` },
              { Icon: Bed, label: 'Habitaciones', value: apartment.bedrooms },
              { Icon: Bath, label: 'Baños', value: apartment.bathrooms },
              { Icon: null, label: 'Precio/noche', value: `$${apartment.price_per_night?.toLocaleString('es-AR')}` },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="border border-hairline p-4 text-center" style={{ borderRadius: '4px' }}>
                {Icon && <Icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />}
                <p className="text-xs text-muted mb-1">{label}</p>
                <p className="font-display text-lg font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>

          {apartment.amenities && apartment.amenities.length > 0 && (
            <div className="mb-10">
              <h2 className="font-display text-xl font-bold text-ink mb-4">Comodidades</h2>
              <div className="flex flex-wrap gap-2">
                {apartment.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="bg-[#efece6] text-ink-soft px-4 py-1.5 text-sm rounded-full border border-hairline"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link
            to={`/booking/${apartment.id}`}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-paper font-display font-semibold text-base px-8 py-4 rounded-full transition-all duration-150 hover:-translate-y-px"
          >
            <Calendar className="w-4 h-4" />
            Reservar Ahora
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default ApartmentDetailPage
