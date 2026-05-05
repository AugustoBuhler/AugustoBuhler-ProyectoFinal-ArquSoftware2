import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ClipboardList, Calendar, Users, DollarSign,
  CheckCircle, XCircle, Clock, AlertCircle, CreditCard,
  User, Mail, Phone, Hash,
} from 'lucide-react'
import { getBookingById } from '../services/api'
import { formatDate } from '../utils/dateUtils'

const STATUS_CONFIG = {
  reservada: {
    label: 'Reservada',
    icon: Clock,
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  pagado: {
    label: 'Pagado',
    icon: CheckCircle,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  cancelada: {
    label: 'Cancelada',
    icon: XCircle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
  finalizada: {
    label: 'Finalizada',
    icon: CheckCircle,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    dot: 'bg-blue-500',
  },
  // Backward compat para datos con estados anteriores
  confirmed: { label: 'Reservada', icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', iconColor: 'text-yellow-500', dot: 'bg-yellow-500' },
  pending: { label: 'Reservada', icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', iconColor: 'text-yellow-500', dot: 'bg-yellow-500' },
  cancelled: { label: 'Cancelada', icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', iconColor: 'text-red-500', dot: 'bg-red-500' },
  concluida: { label: 'Finalizada', icon: CheckCircle, bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', iconColor: 'text-blue-500', dot: 'bg-blue-500' },
}

const PAYMENT_LABELS = {
  transferencia: 'Transferencia Bancaria',
  efectivo: 'Efectivo',
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.reservada
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  )
}

// ─── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-primary-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  </div>
)

// ─── BookingStatusPage ─────────────────────────────────────────────────────────
const BookingStatusPage = () => {
  const [inputId, setInputId] = useState('')
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    const trimmed = inputId.trim()
    if (!trimmed) return

    const numId = parseInt(trimmed)
    if (isNaN(numId) || numId <= 0) {
      setError('Ingresá un número de reserva válido.')
      return
    }

    setLoading(true)
    setError('')
    setBooking(null)
    setSearched(true)

    try {
      const data = await getBookingById(numId)
      if (data.check_in instanceof Date) data.check_in = data.check_in.toISOString().split('T')[0]
      if (data.check_out instanceof Date) data.check_out = data.check_out.toISOString().split('T')[0]
      setBooking(data)
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No encontramos ninguna reserva con ese número. Verificá que sea correcto.')
      } else {
        setError('Ocurrió un error al consultar la reserva. Por favor, intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const nightsBetween = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0
    const [y1, m1, d1] = checkIn.split('-').map(Number)
    const [y2, m2, d2] = checkOut.split('-').map(Number)
    const diff = new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
          <ClipboardList className="w-8 h-8 text-primary-600" />
        </div>
        <p className="text-sm tracking-[0.25em] uppercase text-primary-500 mb-2">Estado de reserva</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Consultá tu Reserva</h1>
        <p className="text-gray-600">
          Ingresá el número de reserva que recibiste al confirmar para ver su estado actual.
        </p>
      </motion.div>

      {/* Search card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-xl p-6 mb-6"
      >
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={inputId}
              onChange={(e) => {
                setInputId(e.target.value)
                if (error) setError('')
              }}
              placeholder="Ej: 12345"
              min="1"
              className="input-field pl-10 w-full text-lg"
            />
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading || !inputId.trim()}
            className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">{loading ? 'Buscando...' : 'Consultar'}</span>
          </motion.button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Result card */}
      <AnimatePresence>
        {booking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Card header strip */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-xs uppercase tracking-widest mb-1">Número de reserva</p>
                <p className="text-white text-3xl font-bold">#{booking.id}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="p-6 space-y-6">
              {/* Dates & guests */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Detalles de la estadía</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={Calendar} label="Check-in" value={formatDate(booking.check_in)} />
                  <InfoRow icon={Calendar} label="Check-out" value={formatDate(booking.check_out)} />
                  <InfoRow
                    icon={Users}
                    label="Huéspedes"
                    value={`${booking.guests} persona${booking.guests !== 1 ? 's' : ''}`}
                  />
                  <InfoRow
                    icon={Clock}
                    label="Noches"
                    value={`${nightsBetween(booking.check_in, booking.check_out)} noche${nightsBetween(booking.check_in, booking.check_out) !== 1 ? 's' : ''}`}
                  />
                </div>
              </div>

              {/* Price & payment */}
              <div className="border-t pt-5">
                <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Pago</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow
                    icon={DollarSign}
                    label="Total"
                    value={`$${Number(booking.total_price).toLocaleString('es-AR')}`}
                  />
                  <InfoRow
                    icon={CreditCard}
                    label="Método de pago"
                    value={PAYMENT_LABELS[booking.payment_method] || booking.payment_method}
                  />
                </div>
              </div>

              {/* Guest info */}
              {booking.user_info && (
                <div className="border-t pt-5">
                  <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Datos del huésped</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow
                      icon={User}
                      label="Nombre completo"
                      value={`${booking.user_info.first_name} ${booking.user_info.last_name}`}
                    />
                    <InfoRow icon={Hash} label="DNI" value={booking.user_info.dni} />
                    <InfoRow icon={Mail} label="Email" value={booking.user_info.email} />
                    <InfoRow icon={Phone} label="Teléfono" value={booking.user_info.phone} />
                  </div>
                </div>
              )}

              {/* Status explanation */}
              {['reservada', 'confirmed', 'pending'].includes(booking.status) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Tu reserva está registrada. Te contactaremos para coordinar los detalles.
                  </p>
                </div>
              )}
              {booking.status === 'pagado' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">
                    Tu reserva está confirmada y el pago fue registrado. ¡Te esperamos!
                  </p>
                </div>
              )}
              {['cancelada', 'cancelled'].includes(booking.status) && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    Esta reserva fue cancelada. Si tenés dudas, contactanos.
                  </p>
                </div>
              )}
              {['finalizada', 'concluida'].includes(booking.status) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Esta reserva finalizó. ¡Esperamos que hayas disfrutado tu estadía!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty search hint */}
      {!searched && !booking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-8 text-gray-400"
        >
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">El número de reserva figura en el correo de confirmación que recibiste.</p>
        </motion.div>
      )}
    </div>
  )
}

export default BookingStatusPage
