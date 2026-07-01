import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Star, Shield, Clock, CheckCircle, X, ClipboardList } from 'lucide-react'
import { getApartmentTypes } from '../services/apartmentTypes'
import ApartmentTypeCard from '../components/ApartmentTypeCard'

const BUILDING_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=85'

const FEATURES = [
  { label: 'A', title: 'Búsqueda fácil', desc: 'Filtrá por fechas, precio y capacidad en segundos.' },
  { label: 'B', title: 'Calidad garantizada', desc: 'Departamentos amoblados, luminosos y modernos.' },
  { label: 'C', title: 'Reserva segura', desc: 'Proceso 100% digital, sin intermediarios.' },
  { label: 'D', title: 'Check-in ágil', desc: 'Confirmación inmediata y gestión online.' },
]

const HomePage = () => {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmedBookingId, setConfirmedBookingId] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    loadApartmentTypes()
    const bookingId = searchParams.get('booking_id')
    if (searchParams.get('reserva_confirmada') === 'true' && bookingId) {
      setConfirmedBookingId(bookingId)
      navigate('/', { replace: true })
    }
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
      {/* Booking confirmed banner */}
      <AnimatePresence>
        {confirmedBookingId && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative z-50 bg-ink text-paper px-4 py-4"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-primary-400" />
                <div>
                  <p className="font-semibold text-base leading-tight">
                    ¡Tu reserva #{confirmedBookingId} fue confirmada!
                  </p>
                  <p className="text-paper/60 text-sm mt-0.5">
                    Recibirás un email con todos los detalles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/booking-status?id=${confirmedBookingId}`)}
                  className="inline-flex items-center gap-1.5 border border-paper/30 hover:border-paper/60 text-paper text-sm font-semibold px-3 py-1.5 rounded-full transition-colors duration-150"
                >
                  <ClipboardList className="w-4 h-4" />
                  Ver reserva
                </button>
                <button
                  onClick={() => setConfirmedBookingId(null)}
                  className="p-1.5 rounded-full hover:bg-paper/10 transition-colors duration-150"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="relative h-[560px] md:h-[640px] overflow-hidden">
        <img
          src={BUILDING_IMAGE}
          alt="Edificio de departamentos"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative h-full flex flex-col items-start justify-end px-10 pb-16 max-w-6xl mx-auto w-full">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-[13px] font-medium tracking-[0.22em] uppercase text-primary-400 mb-5 flex items-center gap-3"
          >
            <span className="w-9 h-px bg-primary-400 inline-block" />
            Córdoba, Argentina — Estadías temporales
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="font-display font-bold text-paper leading-none tracking-tight mb-5 max-w-[13ch]"
            style={{ fontSize: 'clamp(52px, 7vw, 88px)' }}
          >
            Tu espacio, <span className="text-primary-400">lejos de casa.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-paper/70 text-lg mb-8 max-w-[34ch]"
          >
            Departamentos amoblados, luminosos y modernos. Reservá en pocos pasos, ya sea por trabajo o turismo.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-paper font-display font-semibold px-8 py-4 rounded-full transition-all duration-150 hover:-translate-y-px text-base"
            >
              <Search className="w-4 h-4" />
              Buscar departamento
            </Link>
            <a
              href="#tipos"
              className="inline-flex items-center gap-2 bg-transparent border border-paper/30 hover:border-paper/60 text-paper font-display font-semibold px-8 py-4 rounded-full transition-all duration-150 text-base"
            >
              Ver tipos de habitación
            </a>
          </motion.div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-10">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { num: '31', label: 'departamentos disponibles' },
              { num: '4',  label: 'tipos de habitación' },
              { num: '2',  label: 'ciudades: Córdoba y Bs. As.' },
              { num: '100%', label: 'reserva digital, sin intermediarios' },
            ].map(({ num, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.5 }}
                className={`py-9 pr-8 ${i !== 0 ? 'pl-8 border-l border-hairline' : ''}`}
              >
                <b className="font-display text-[32px] font-bold text-ink tracking-tight leading-none block">
                  {num}
                </b>
                <span className="text-sm text-muted mt-1 block">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Apartment types */}
      <div id="tipos" className="max-w-6xl mx-auto px-10 py-24">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-baseline justify-between mb-14"
        >
          <div>
            <span className="font-display text-[13px] font-medium tracking-[0.2em] uppercase text-primary-600 block mb-4">
              01 — Encontrá tu espacio
            </span>
            <h2 className="font-display font-bold text-ink tracking-tight leading-none"
              style={{ fontSize: 'clamp(34px, 4vw, 50px)' }}>
              Tipos de habitación
            </h2>
          </div>
          <p className="hidden md:block text-[15px] text-muted max-w-[32ch] text-right">
            Desde habitaciones dobles hasta cuádruples, con todo lo que necesitás para sentirte como en casa.
          </p>
        </motion.div>

        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            <p className="font-semibold mb-1">Error</p>
            <p>{error}</p>
            <button onClick={loadApartmentTypes} className="mt-2 underline text-sm">Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"
            />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-ink-soft text-lg mb-2">No hay tipos de apartamentos disponibles</p>
            <button onClick={loadApartmentTypes} className="btn-primary mt-4">Reintentar</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {types.map((type, index) => (
              <ApartmentTypeCard key={type.type} type={type} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Features strip */}
      <div className="border-t border-hairline">
        <div className="max-w-6xl mx-auto px-10">
          <div className="mb-14 pt-24">
            <span className="font-display text-[13px] font-medium tracking-[0.2em] uppercase text-primary-600 block mb-4">
              02 — Sin vueltas
            </span>
            <h2 className="font-display font-bold text-ink tracking-tight leading-none"
              style={{ fontSize: 'clamp(34px, 4vw, 50px)' }}>
              Por qué Docta Suites
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 border-t border-hairline pb-24">
            {FEATURES.map(({ label, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i }}
                className={`pt-9 pb-2 pr-8 ${i !== 0 ? 'pl-8 border-l border-hairline' : ''}`}
              >
                <span className="font-display text-[13px] text-primary-600 tracking-[0.15em] font-medium">{label}</span>
                <h3 className="font-display text-[17px] font-semibold text-ink mt-3.5 mb-2">{title}</h3>
                <p className="text-[15px] text-ink-soft">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Band */}
      <div className="bg-ink py-24" style={{ borderRadius: '4px', margin: '0 40px 60px' }}>
        <div className="max-w-4xl mx-auto px-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2
              className="font-display font-bold text-paper leading-tight tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.6vw, 44px)' }}
            >
              ¿Ya reservaste?<br />Consultá tu reserva.
            </h2>
            <p className="text-paper/60 mt-4 max-w-[38ch]">
              Ingresá el número de reserva que recibiste al confirmar para ver su estado actual.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/booking-status"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-paper font-display font-semibold px-6 py-4 rounded-full transition-all duration-150 hover:-translate-y-px text-base"
            >
              Consultar reserva
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center justify-center gap-2 border border-paper/20 hover:border-paper/40 text-paper font-display font-semibold px-6 py-4 rounded-full transition-all duration-150 text-base"
            >
              <Search className="w-4 h-4" />
              Ver todos los departamentos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
