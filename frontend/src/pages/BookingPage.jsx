import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, User, Mail, Phone, CreditCard, ArrowLeft,
  AlertCircle, Loader2, Home, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { getApartmentById, createBooking } from '../services/api'
import { getAvailableApartmentByType, getApartmentTypes } from '../services/apartmentTypes'
import { format } from 'date-fns'

// Mirrors the backend's GetApartmentType(name) logic
const getTypeFromName = (name = '') => {
  if (name.startsWith('Quadruple')) return 'quadruple'
  if (name.startsWith('Double Matrimonial')) return 'double_matrimonial'
  if (name.startsWith('Double Twin')) return 'double_twin'
  if (name.startsWith('Triple')) return 'triple'
  return null
}

const TYPE_LABELS = {
  quadruple: 'Cuádruple',
  triple: 'Triple',
  double_matrimonial: 'Doble Matrimonial',
  double_twin: 'Doble Twin',
}

// ─── Facility images shown in the gallery (fallback when apartment has no images) ─
const FACILITY_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80',
]

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

// ─── Image Gallery ─────────────────────────────────────────────────────────────
const ImageGallery = ({ images }) => {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const total = images.length

  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent(prev => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [total])

  const prev = () => {
    setDirection(-1)
    setCurrent(prev => (prev - 1 + total) % total)
  }

  const next = () => {
    setDirection(1)
    setCurrent(prev => (prev + 1) % total)
  }

  const goTo = (idx) => {
    setDirection(idx > current ? 1 : -1)
    setCurrent(idx)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden h-[240px] sm:h-[320px] md:h-[400px] mb-8 group"
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          src={images[current]}
          alt={`Instalaciones ${current + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

      {/* Arrows: always visible on mobile, hover-reveal on desktop */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75 w-2'
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="absolute top-4 right-4 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
        {current + 1} / {total}
      </div>
    </motion.div>
  )
}

// ─── Availability Modal ────────────────────────────────────────────────────────
const AvailabilityModal = ({ mode, typeName, onAccept, onDecline, onGoHome }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 24 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
    >
      {mode === 'searching' && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-5"
          >
            <Loader2 className="w-full h-full text-primary-600" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Buscando disponibilidad...</h3>
          <p className="text-gray-500">Estamos buscando otra habitación con las mismas características.</p>
        </>
      )}

      {mode === 'confirm' && (
        <>
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-9 h-9 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Habitación no disponible</h3>
          <p className="text-gray-600 mb-2">
            Esta habitación ya está reservada para las fechas que seleccionaste.
          </p>
          <p className="text-gray-700 font-medium mb-7">
            ¿Querés que te asignemos otra habitación{typeName ? ` de tipo <strong>${typeName}</strong>` : ''} con las mismas características?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Sí, asignar otra
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDecline}
              className="flex-1 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              No, volver
            </motion.button>
          </div>
        </>
      )}

      {mode === 'none_available' && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-9 h-9 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">Lo sentimos</h3>
          <p className="text-gray-600 mb-2">
            No quedan habitaciones con esas características disponibles para las fechas seleccionadas.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Podés explorar otros tipos de habitaciones o elegir fechas distintas.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGoHome}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Ver otras habitaciones
          </motion.button>
        </>
      )}
    </motion.div>
  </motion.div>
)

// ─── BookingPage ───────────────────────────────────────────────────────────────
const BookingPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const apartmentType = searchParams.get('type')

  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState({
    check_in: '',
    check_out: '',
    guests: 1,
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
    email: '',
    payment_method: 'transferencia',
  })
  const [errors, setErrors] = useState({})

  // 'hidden' | 'confirm' | 'searching' | 'none_available'
  const [modalMode, setModalMode] = useState('hidden')

  useEffect(() => {
    const loadApartment = async () => {
      try {
        if (apartmentType) {
          const types = await getApartmentTypes()
          const match = types.find(t => t.type === apartmentType)
          setApartment({
            id: null,
            name: apartmentType,
            price_per_night: match?.min_price || 0,
            max_guests: match?.max_guests || (apartmentType === 'quadruple' ? 4 : apartmentType === 'triple' ? 3 : 2),
          })
        } else if (id) {
          const data = await getApartmentById(id)
          setApartment(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadApartment()
  }, [id, apartmentType])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    if (submitError) setSubmitError('')
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.check_in) newErrors.check_in = 'Fecha de entrada requerida'
    if (!formData.check_out) newErrors.check_out = 'Fecha de salida requerida'
    if (formData.check_in && formData.check_out && formData.check_out <= formData.check_in) {
      newErrors.check_out = 'La fecha de salida debe ser posterior a la de entrada'
    }
    if (!formData.guests || formData.guests < 1) newErrors.guests = 'Número de huéspedes requerido'
    if (!formData.first_name) newErrors.first_name = 'Nombre requerido'
    if (!formData.last_name) newErrors.last_name = 'Apellido requerido'
    if (!formData.dni) newErrors.dni = 'DNI requerido'
    if (!formData.phone) newErrors.phone = 'Teléfono requerido'
    if (!formData.email) newErrors.email = 'Email requerido'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido'
    if (!formData.payment_method) newErrors.payment_method = 'Método de pago requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const buildBookingPayload = (aptID) => ({
    ...(aptID ? { apartment_id: aptID } : {}),
    ...(apartmentType ? { apartment_type: apartmentType } : {}),
    check_in: formData.check_in,
    check_out: formData.check_out,
    guests: parseInt(formData.guests),
    user_info: {
      first_name: formData.first_name,
      last_name: formData.last_name,
      dni: formData.dni,
      phone: formData.phone,
      email: formData.email,
    },
    payment_method: formData.payment_method,
  })

  const isUnavailableError = (error) => {
    const msg = (error.response?.data?.error || '').toLowerCase()
    return (
      msg.includes('not available') ||
      msg.includes('no available') ||
      msg.includes('not available for') ||
      error.response?.status === 409
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')
    try {
      let apartmentID = null

      if (apartmentType) {
        // Flow A: booking by type — find any available apartment of this type
        try {
          const available = await getAvailableApartmentByType(
            apartmentType, formData.check_in, formData.check_out
          )
          apartmentID = available.id
          setApartment(available)
        } catch {
          // No apartments of this type available
          setModalMode('none_available')
          setSubmitting(false)
          return
        }
      } else {
        apartmentID = parseInt(id)
      }

      const booking = await createBooking(buildBookingPayload(apartmentID))
      navigate(`/confirmation/${booking.id}`)
    } catch (error) {
      if (isUnavailableError(error)) {
        // Specific apartment is taken → offer alternative
        setModalMode('confirm')
      } else {
        setSubmitError(error.response?.data?.error || 'Error al crear la reserva. Por favor, intenta nuevamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptAlternative = async () => {
    setModalMode('searching')

    const type = apartmentType || getTypeFromName(apartment?.name)
    if (!type) {
      setModalMode('none_available')
      return
    }

    try {
      const alt = await getAvailableApartmentByType(type, formData.check_in, formData.check_out)
      setApartment(alt)
      const booking = await createBooking(buildBookingPayload(alt.id))
      setModalMode('hidden')
      navigate(`/confirmation/${booking.id}`)
    } catch {
      setModalMode('none_available')
    }
  }

  const handleDeclineAlternative = () => setModalMode('hidden')

  const handleGoHome = () => navigate('/')

  // ── Derived values ──
  const calculateNights = () => {
    if (!formData.check_in || !formData.check_out) return 0
    const diff = new Date(formData.check_out) - new Date(formData.check_in)
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }
  const nights = calculateNights()
  const totalPrice = nights * (apartment?.price_per_night || 0)
  const derivedType = apartmentType || getTypeFromName(apartment?.name)

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

  if (!apartment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {apartmentType ? 'Tipo de apartamento no encontrado' : 'Apartamento no encontrado'}
        </div>
      </div>
    )
  }

  return (
    <>
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

        <ImageGallery
          images={apartment?.images?.length > 0 ? apartment.images : FACILITY_IMAGES}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Form ── */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Completa tu Reserva</h2>

              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{submitError}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dates */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fechas de Estancia
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Check-in</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="date"
                          name="check_in"
                          value={formData.check_in}
                          onChange={handleChange}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className={`input-field pl-10 ${errors.check_in ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.check_in && <p className="text-red-500 text-xs mt-1">{errors.check_in}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Check-out</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="date"
                          name="check_out"
                          value={formData.check_out}
                          onChange={handleChange}
                          min={formData.check_in || format(new Date(), 'yyyy-MM-dd')}
                          className={`input-field pl-10 ${errors.check_out ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.check_out && <p className="text-red-500 text-xs mt-1">{errors.check_out}</p>}
                    </div>
                  </div>
                </div>

                {/* Guests */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Número de Huéspedes
                  </label>
                  <input
                    type="number"
                    name="guests"
                    value={formData.guests}
                    onChange={handleChange}
                    min="1"
                    max={apartment?.max_guests || 10}
                    className={`input-field ${errors.guests ? 'border-red-500' : ''}`}
                  />
                  {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests}</p>}
                  {apartment?.max_guests && (
                    <p className="text-xs text-gray-500 mt-1">Máximo {apartment.max_guests} huéspedes</p>
                  )}
                </div>

                {/* Guest info */}
                <div className="border-t pt-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Datos del Huésped</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          className={`input-field pl-10 ${errors.first_name ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Apellido</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className={`input-field ${errors.last_name ? 'border-red-500' : ''}`}
                      />
                      {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs text-gray-600 mb-1">DNI</label>
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className={`input-field ${errors.dni ? 'border-red-500' : ''}`}
                    />
                    {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Método de Pago</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.payment_method ? 'border-red-500' : ''}`}
                      >
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </div>
                    {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting}
                  className="btn-primary w-full text-lg py-4 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </span>
                  ) : 'Confirmar Reserva'}
                </motion.button>
              </form>
            </motion.div>
          </div>

          {/* ── Summary sidebar ── */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 sticky top-24"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Resumen</h3>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-800">
                  {apartmentType ? `Tipo: ${TYPE_LABELS[apartmentType] || apartmentType}` : apartment.name}
                </h4>
                {apartment.city && <p className="text-sm text-gray-600">{apartment.city}</p>}
                {apartmentType && (
                  <p className="text-sm text-gray-500 mt-1">
                    Se asignará un apartamento disponible al confirmar
                  </p>
                )}
              </div>

              <div className="border-t border-b py-4 space-y-2">
                {apartment.price_per_night > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Precio por noche</span>
                      <span className="font-semibold text-gray-900">
                        ${apartment.price_per_night.toLocaleString('es-AR')}
                      </span>
                    </div>

                    {nights > 0 ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Noches</span>
                          <span className="font-semibold">{nights}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total</span>
                          <span className="text-primary-600">
                            ${totalPrice.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
                        >
                          <p className="text-xs text-amber-700 font-medium mb-1">Seña anticipada (30%)</p>
                          <p className="text-xl font-bold text-amber-600">
                            ${(totalPrice * 0.30).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Monto a abonar al confirmar la reserva
                          </p>
                        </motion.div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 pt-1">
                        Seleccioná las fechas para ver el total
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Cargando precio...</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Availability Modal ── */}
      <AnimatePresence>
        {modalMode !== 'hidden' && (
          <AvailabilityModal
            mode={modalMode}
            typeName={TYPE_LABELS[derivedType] || derivedType}
            onAccept={handleAcceptAlternative}
            onDecline={handleDeclineAlternative}
            onGoHome={handleGoHome}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default BookingPage
