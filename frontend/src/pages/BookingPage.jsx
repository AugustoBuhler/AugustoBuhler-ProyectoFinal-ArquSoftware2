import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, User, Mail, Phone, CreditCard, ArrowLeft,
  AlertCircle, Loader2, Home, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { getApartmentById, createBooking, createCheckout, checkTypeAvailability } from '../services/api'
import { getAvailableApartmentByType, getApartmentTypes } from '../services/apartmentTypes'
import { format } from 'date-fns'

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

  const prev = () => { setDirection(-1); setCurrent(prev => (prev - 1 + total) % total) }
  const next = () => { setDirection(1); setCurrent(prev => (prev + 1) % total) }
  const goTo = (idx) => { setDirection(idx > current ? 1 : -1); setCurrent(idx) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden h-[220px] sm:h-[300px] md:h-[380px] mb-8 group"
      style={{ borderRadius: '4px' }}
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

      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/80 hover:bg-paper text-ink flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/80 hover:bg-paper text-ink flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {total > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-paper w-6' : 'bg-paper/50 hover:bg-paper/75 w-1.5'}`}
            />
          ))}
        </div>
      )}

      <div className="absolute top-3 right-3 bg-paper/70 text-ink text-xs px-2.5 py-1 rounded-full pointer-events-none">
        {current + 1} / {total}
      </div>
    </motion.div>
  )
}

const AvailabilityModal = ({ mode, typeName, onAccept, onDecline, onGoHome }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      className="bg-paper border border-hairline max-w-md w-full p-8 text-center"
      style={{ borderRadius: '4px' }}
    >
      {mode === 'searching' && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 mx-auto mb-5"
          >
            <Loader2 className="w-full h-full text-primary-600" />
          </motion.div>
          <h3 className="font-display text-xl font-bold text-ink mb-2">Buscando disponibilidad...</h3>
          <p className="text-ink-soft text-sm">Estamos buscando otra habitación con las mismas características.</p>
        </>
      )}

      {mode === 'confirm' && (
        <>
          <div className="w-14 h-14 rounded-full border border-hairline flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-primary-600" />
          </div>
          <h3 className="font-display text-xl font-bold text-ink mb-2">Habitación no disponible</h3>
          <p className="text-ink-soft text-sm mb-2">
            Esta habitación ya está reservada para las fechas que seleccionaste.
          </p>
          <p className="text-ink font-medium text-sm mb-8">
            ¿Querés que te asignemos otra habitación{typeName ? ` de tipo ${typeName}` : ''} con las mismas características?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onAccept}
              className="flex-1 btn-primary text-sm py-3"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sí, asignar otra
            </button>
            <button
              onClick={onDecline}
              className="flex-1 btn-secondary text-sm py-3"
            >
              No, volver
            </button>
          </div>
        </>
      )}

      {mode === 'none_available' && (
        <>
          <div className="w-14 h-14 rounded-full border border-hairline flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-display text-xl font-bold text-ink mb-3">Lo sentimos</h3>
          <p className="text-ink-soft text-sm mb-2">
            No quedan habitaciones con esas características disponibles para las fechas seleccionadas.
          </p>
          <p className="text-muted text-xs mb-8">
            Podés explorar otros tipos de habitaciones o elegir fechas distintas.
          </p>
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 btn-primary text-sm py-3 px-6"
          >
            <Home className="w-4 h-4" />
            Ver otras habitaciones
          </button>
        </>
      )}
    </motion.div>
  </motion.div>
)

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
  const [availability, setAvailability] = useState(null)
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

  useEffect(() => {
    const type = apartmentType
    const { check_in, check_out } = formData
    if (!type || !check_in || !check_out) { setAvailability(null); return }
    if (check_out <= check_in) { setAvailability(null); return }
    setAvailability('checking')
    const timer = setTimeout(async () => {
      const result = await checkTypeAvailability(type, check_in, check_out)
      setAvailability(result)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.check_in, formData.check_out, apartmentType])

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
    if (formData.check_in && formData.check_out && formData.check_out <= formData.check_in)
      newErrors.check_out = 'La fecha de salida debe ser posterior a la de entrada'
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
        try {
          const available = await getAvailableApartmentByType(apartmentType, formData.check_in, formData.check_out)
          apartmentID = available.id
          setApartment(available)
        } catch {
          setModalMode('none_available')
          setSubmitting(false)
          return
        }
      } else {
        apartmentID = parseInt(id)
      }
      const booking = await createBooking(buildBookingPayload(apartmentID))
      const checkout = await createCheckout(booking.id)
      navigate(`/reserva/pago/esperando?id=${booking.id}&mp=${encodeURIComponent(checkout.init_point)}${apartmentType ? `&type=${apartmentType}` : ''}`)
    } catch (error) {
      if (isUnavailableError(error)) {
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
    if (!type) { setModalMode('none_available'); return }
    try {
      const alt = await getAvailableApartmentByType(type, formData.check_in, formData.check_out)
      setApartment(alt)
      const booking = await createBooking(buildBookingPayload(alt.id))
      setModalMode('hidden')
      const checkout = await createCheckout(booking.id)
      navigate(`/reserva/pago/esperando?id=${booking.id}&mp=${encodeURIComponent(checkout.init_point)}${apartmentType ? `&type=${apartmentType}` : ''}`)
    } catch {
      setModalMode('none_available')
    }
  }

  const handleDeclineAlternative = () => setModalMode('hidden')
  const handleGoHome = () => navigate('/')

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
      <div className="flex justify-center items-center min-h-screen gap-3 text-muted">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!apartment) {
    return (
      <div className="max-w-6xl mx-auto px-10 py-8">
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
          {apartmentType ? 'Tipo de apartamento no encontrado' : 'Apartamento no encontrado'}
        </div>
      </div>
    )
  }

  const fieldClass = (name) =>
    `input-field ${errors[name] ? 'border-red-400 focus:border-red-500' : ''}`

  return (
    <>
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

        <ImageGallery images={apartment?.images?.length > 0 ? apartment.images : FACILITY_IMAGES} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-hairline bg-paper p-8"
              style={{ borderRadius: '4px' }}
            >
              <h2 className="font-display text-[28px] font-bold text-ink mb-6">Completá tu Reserva</h2>

              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded mb-6 text-sm"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{submitError}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dates */}
                <div>
                  <label className="block text-[13px] font-semibold text-ink tracking-[0.08em] uppercase mb-3">
                    Fechas de Estancia
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted mb-1">Check-in</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <input
                          type="date"
                          name="check_in"
                          value={formData.check_in}
                          onChange={handleChange}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className={`${fieldClass('check_in')} pl-10`}
                        />
                      </div>
                      {errors.check_in && <p className="text-red-500 text-xs mt-1">{errors.check_in}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Check-out</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <input
                          type="date"
                          name="check_out"
                          value={formData.check_out}
                          onChange={handleChange}
                          min={formData.check_in || format(new Date(), 'yyyy-MM-dd')}
                          className={`${fieldClass('check_out')} pl-10`}
                        />
                      </div>
                      {errors.check_out && <p className="text-red-500 text-xs mt-1">{errors.check_out}</p>}
                    </div>
                  </div>

                  <AnimatePresence>
                    {availability !== null && apartmentType && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-2"
                      >
                        {availability === 'checking' && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Verificando disponibilidad…
                          </div>
                        )}
                        {availability === true && (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ¡Hay disponibilidad para esas fechas!
                          </div>
                        )}
                        {availability === false && (
                          <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            No hay disponibilidad para esas fechas. Probá con otras fechas.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Guests */}
                <div>
                  <label className="block text-[13px] font-semibold text-ink tracking-[0.08em] uppercase mb-2">
                    Número de Huéspedes
                  </label>
                  <input
                    type="number"
                    name="guests"
                    value={formData.guests}
                    onChange={handleChange}
                    min="1"
                    max={apartment?.max_guests || 10}
                    className={fieldClass('guests')}
                  />
                  {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests}</p>}
                  {apartment?.max_guests && (
                    <p className="text-xs text-muted mt-1">Máximo {apartment.max_guests} huéspedes</p>
                  )}
                </div>

                {/* Guest info */}
                <div className="border-t border-hairline pt-6">
                  <h3 className="font-display text-[18px] font-bold text-ink mb-5">Datos del Huésped</h3>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-muted mb-1">Nombre</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          className={`${fieldClass('first_name')} pl-10`}
                        />
                      </div>
                      {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Apellido</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className={fieldClass('last_name')}
                      />
                      {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs text-muted mb-1">DNI</label>
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className={fieldClass('dni')}
                    />
                    {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-muted mb-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`${fieldClass('phone')} pl-10`}
                        />
                      </div>
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`${fieldClass('email')} pl-10`}
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted mb-1">Método de Pago</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        className={`${fieldClass('payment_method')} pl-10 appearance-none`}
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
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting}
                  className="btn-primary w-full text-base py-4 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </span>
                  ) : 'Confirmar Reserva'}
                </motion.button>
              </form>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="border border-hairline bg-paper p-6 sticky top-24"
              style={{ borderRadius: '4px' }}
            >
              <h3 className="font-display text-[20px] font-bold text-ink mb-5">Resumen</h3>

              <div className="mb-4">
                <h4 className="font-semibold text-ink text-sm">
                  {apartmentType ? `Tipo: ${TYPE_LABELS[apartmentType] || apartmentType}` : apartment.name}
                </h4>
                {apartment.city && <p className="text-sm text-ink-soft mt-0.5">{apartment.city}</p>}
                {apartmentType && (
                  <p className="text-xs text-muted mt-1">Se asignará un apartamento disponible al confirmar</p>
                )}
              </div>

              <div className="border-t border-b border-hairline py-4 space-y-2">
                {apartment.price_per_night > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-soft">Precio por noche</span>
                      <span className="font-semibold text-ink">
                        ${apartment.price_per_night?.toLocaleString('es-AR')}
                      </span>
                    </div>

                    {nights > 0 ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-soft">Noches</span>
                          <span className="font-semibold text-ink">{nights}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-hairline">
                          <span className="font-display font-bold text-ink">Total</span>
                          <span className="font-display font-bold text-ink text-lg">
                            ${totalPrice.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 border border-primary-200 bg-primary-50 px-4 py-3 rounded"
                        >
                          <p className="text-xs text-primary-700 font-semibold mb-1">Seña anticipada (30%)</p>
                          <p className="font-display text-[22px] font-bold text-primary-600 leading-none">
                            ${(totalPrice * 0.30).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-primary-600 mt-1">Monto a abonar al confirmar</p>
                        </motion.div>
                      </>
                    ) : (
                      <p className="text-sm text-muted pt-1">Seleccioná las fechas para ver el total</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">Cargando precio...</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

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
