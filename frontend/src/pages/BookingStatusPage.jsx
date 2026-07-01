import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ClipboardList, Calendar, Users, DollarSign,
  CheckCircle, XCircle, Clock, AlertCircle, CreditCard,
  User, Mail, Phone, Hash, Trash2, MessageSquare, Loader2,
  ChevronRight,
} from 'lucide-react'
import { getBookingById, cancelBookingAsGuest, getBookingsByContact } from '../services/api'
import { formatDate } from '../utils/dateUtils'

const STATUS_CONFIG = {
  reservada:  { label: 'Reservada',  icon: Clock,        bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', dot: 'bg-yellow-500' },
  pagado:     { label: 'Pagado',     icon: CheckCircle,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  cancelada:  { label: 'Cancelada',  icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500' },
  finalizada: { label: 'Finalizada', icon: CheckCircle,  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500' },
  confirmed:  { label: 'Reservada',  icon: Clock,        bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', dot: 'bg-yellow-500' },
  pending:    { label: 'Reservada',  icon: Clock,        bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200', dot: 'bg-yellow-500' },
  cancelled:  { label: 'Cancelada',  icon: XCircle,      bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500' },
  concluida:  { label: 'Finalizada', icon: CheckCircle,  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500' },
}

const PAYMENT_LABELS = {
  transferencia: 'Transferencia Bancaria',
  efectivo: 'Efectivo',
}

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

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded border border-hairline flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#efece6]">
      <Icon className="w-4 h-4 text-primary-600" />
    </div>
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-ink">{value}</p>
    </div>
  </div>
)

const CANCEL_STEPS = { idle: 'idle', confirm: 'confirm', reason: 'reason', cancelled: 'cancelled' }

const BookingStatusPage = () => {
  const [searchMode, setSearchMode] = useState('id')
  const [inputId, setInputId] = useState('')
  const [dni, setDni] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactResults, setContactResults] = useState([])
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [cancelStep, setCancelStep] = useState(CANCEL_STEPS.idle)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    const trimmed = inputId.trim()
    if (!trimmed) return
    const numId = parseInt(trimmed)
    if (isNaN(numId) || numId <= 0) { setError('Ingresá un número de reserva válido.'); return }
    setLoading(true); setError(''); setBooking(null); setSearched(true)
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

  const resetSearch = () => {
    setBooking(null); setContactResults([]); setSearched(false)
    setError(''); setCancelStep(CANCEL_STEPS.idle); setCancelReason('')
  }

  const handleModeSwitch = (mode) => { setSearchMode(mode); resetSearch() }

  const handleContactSearch = async (e) => {
    e.preventDefault()
    if (!dni.trim() || !contactEmail.trim()) return
    setLoading(true); setError(''); setBooking(null); setContactResults([]); setSearched(true)
    try {
      const res = await getBookingsByContact(dni.trim(), contactEmail.trim())
      setContactResults(res.data || [])
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No encontramos reservas con ese DNI y email. Verificá que los datos sean correctos.')
      } else {
        setError('Ocurrió un error al consultar. Por favor, intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubmit = async () => {
    setCancelLoading(true); setCancelError('')
    try {
      await cancelBookingAsGuest(booking.id, cancelReason)
      setBooking(prev => ({ ...prev, status: 'cancelada' }))
      setCancelStep(CANCEL_STEPS.cancelled)
    } catch (err) {
      setCancelError(err.response?.data?.error || 'Error al cancelar. Por favor intentá de nuevo.')
    } finally {
      setCancelLoading(false)
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
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <span className="font-display text-[13px] font-medium tracking-[0.2em] uppercase text-primary-600 block mb-4">
          Estado de reserva
        </span>
        <h1 className="font-display font-bold text-ink tracking-tight leading-none mb-3"
          style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>
          Consultá tu Reserva
        </h1>
        <p className="text-ink-soft">
          Ingresá el número de reserva que recibiste al confirmar para ver su estado actual.
        </p>
      </motion.div>

      {/* Toggle modo de búsqueda */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex border border-hairline mb-4"
        style={{ borderRadius: '999px', overflow: 'hidden' }}
      >
        <button
          onClick={() => handleModeSwitch('id')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-150 ${
            searchMode === 'id' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Hash className="w-4 h-4" />
          Por número de reserva
        </button>
        <button
          onClick={() => handleModeSwitch('contact')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors duration-150 ${
            searchMode === 'contact' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
          }`}
        >
          <User className="w-4 h-4" />
          Por DNI y email
        </button>
      </motion.div>

      {/* Search card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="border border-hairline bg-paper p-6 mb-6"
        style={{ borderRadius: '4px' }}
      >
        {searchMode === 'id' ? (
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="number"
                value={inputId}
                onChange={(e) => { setInputId(e.target.value); if (error) setError('') }}
                placeholder="Ej: 12345"
                min="1"
                className="input-field pl-10 w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputId.trim()}
              className="btn-primary px-5 gap-2 disabled:opacity-50"
            >
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-paper border-t-transparent rounded-full" />
                : <Search className="w-4 h-4" />}
              <span className="hidden sm:inline">{loading ? 'Buscando...' : 'Consultar'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleContactSearch} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => { setDni(e.target.value); if (error) setError('') }}
                  placeholder="DNI / Documento"
                  className="input-field pl-10 w-full"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => { setContactEmail(e.target.value); if (error) setError('') }}
                  placeholder="Email de la reserva"
                  className="input-field pl-10 w-full"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !dni.trim() || !contactEmail.trim()}
              className="w-full btn-primary gap-2 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
                : <><Search className="w-4 h-4" /> Buscar mis reservas</>}
            </button>
          </form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mt-4 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Resultados búsqueda por contacto */}
      <AnimatePresence>
        {contactResults.length > 0 && !booking && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 space-y-3">
            <p className="text-sm text-muted font-medium px-1">
              {contactResults.length === 1 ? 'Se encontró 1 reserva' : `Se encontraron ${contactResults.length} reservas`} — seleccioná una:
            </p>
            {contactResults.map((r) => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.reservada
              return (
                <button
                  key={r.id}
                  onClick={() => { setBooking(r); setCancelStep(CANCEL_STEPS.idle) }}
                  className="w-full border border-hairline bg-paper hover:border-ink p-4 flex items-center justify-between transition-colors duration-150 text-left"
                  style={{ borderRadius: '4px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[52px]">
                      <p className="text-xs text-muted">Reserva</p>
                      <p className="font-display text-lg font-bold text-primary-600">#{r.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{r.check_in} → {r.check_out}</p>
                      <p className="text-xs text-muted">{r.guests} huésped{r.guests !== 1 ? 'es' : ''} · ${Number(r.total_price).toLocaleString('es-AR')} ARS</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {booking && (
          <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35 }}
            className="border border-hairline bg-paper overflow-hidden"
            style={{ borderRadius: '4px' }}
          >
            {/* Header strip */}
            <div className="bg-ink px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-paper/50 text-xs uppercase tracking-widest mb-1">Número de reserva</p>
                <p className="font-display text-paper text-3xl font-bold">#{booking.id}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-muted mb-4 font-display font-medium">Detalles de la estadía</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={Calendar} label="Check-in" value={formatDate(booking.check_in)} />
                  <InfoRow icon={Calendar} label="Check-out" value={formatDate(booking.check_out)} />
                  <InfoRow icon={Users} label="Huéspedes" value={`${booking.guests} persona${booking.guests !== 1 ? 's' : ''}`} />
                  <InfoRow icon={Clock} label="Noches" value={`${nightsBetween(booking.check_in, booking.check_out)} noche${nightsBetween(booking.check_in, booking.check_out) !== 1 ? 's' : ''}`} />
                </div>
              </div>

              <div className="border-t border-hairline pt-5">
                <h3 className="text-xs uppercase tracking-widest text-muted mb-4 font-display font-medium">Pago</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={DollarSign} label="Total" value={`$${Number(booking.total_price).toLocaleString('es-AR')}`} />
                  <InfoRow icon={CreditCard} label="Método de pago" value={PAYMENT_LABELS[booking.payment_method] || booking.payment_method} />
                </div>
              </div>

              {booking.user_info && (
                <div className="border-t border-hairline pt-5">
                  <h3 className="text-xs uppercase tracking-widest text-muted mb-4 font-display font-medium">Datos del huésped</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Nombre completo" value={`${booking.user_info.first_name} ${booking.user_info.last_name}`} />
                    <InfoRow icon={Hash} label="DNI" value={booking.user_info.dni} />
                    <InfoRow icon={Mail} label="Email" value={booking.user_info.email} />
                    <InfoRow icon={Phone} label="Teléfono" value={booking.user_info.phone} />
                  </div>
                </div>
              )}

              {/* Status info banners */}
              {['reservada', 'confirmed', 'pending'].includes(booking.status) && (
                <div className="border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-start gap-3 rounded-sm">
                  <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">Tu reserva está registrada. Te contactaremos para coordinar los detalles.</p>
                </div>
              )}
              {booking.status === 'pagado' && (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3 rounded-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">Tu reserva está confirmada y el pago fue registrado. ¡Te esperamos!</p>
                </div>
              )}
              {['cancelada', 'cancelled'].includes(booking.status) && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3 rounded-sm">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">Esta reserva fue cancelada. Si tenés dudas, contactanos.</p>
                </div>
              )}
              {['finalizada', 'concluida'].includes(booking.status) && (
                <div className="border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3 rounded-sm">
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">Esta reserva finalizó. ¡Esperamos que hayas disfrutado tu estadía!</p>
                </div>
              )}

              {/* Cancel button */}
              {['reservada', 'confirmed', 'pending'].includes(booking.status) && cancelStep === CANCEL_STEPS.idle && (
                <div className="border-t border-hairline pt-5">
                  <button
                    onClick={() => setCancelStep(CANCEL_STEPS.confirm)}
                    className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 px-6 rounded-full transition-colors duration-150 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancelar reserva
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Modal confirmación */}
          <AnimatePresence>
            {cancelStep === CANCEL_STEPS.confirm && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="bg-paper border border-hairline p-8 max-w-md w-full"
                  style={{ borderRadius: '4px' }}
                >
                  <div className="w-12 h-12 rounded-full border border-red-200 bg-red-50 flex items-center justify-center mx-auto mb-5">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-ink text-center mb-2">
                    ¿Seguro que querés cancelar tu reserva?
                  </h2>
                  <p className="text-ink-soft text-sm text-center mb-7">
                    Esta acción no se puede deshacer. Nuestro equipo se contactará con vos para gestionar la devolución de la seña.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setCancelStep(CANCEL_STEPS.idle)}
                      className="flex-1 btn-secondary text-sm py-3"
                    >
                      No, volver
                    </button>
                    <button
                      onClick={() => setCancelStep(CANCEL_STEPS.reason)}
                      className="flex-1 inline-flex items-center justify-center border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-full text-sm transition-colors duration-150"
                    >
                      Sí, estoy seguro
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pantalla de motivo */}
          <AnimatePresence>
            {cancelStep === CANCEL_STEPS.reason && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                className="mt-4 border border-hairline bg-paper overflow-hidden"
                style={{ borderRadius: '4px' }}
              >
                <div className="bg-ink px-6 py-5 text-center">
                  <h2 className="font-display text-paper text-xl font-bold">Tu reserva será cancelada</h2>
                  <p className="text-paper/50 text-sm mt-1">Reserva #{booking.id}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700 leading-relaxed rounded-sm">
                    En menos de <strong>48 horas</strong> nuestro equipo se contactará con{' '}
                    <strong>{booking.user_info?.email}</strong> para proceder con la devolución de la seña de{' '}
                    <strong>${Number(booking.deposit_amount || 0).toLocaleString('es-AR')} ARS</strong>.
                    Lamentamos cualquier inconveniente.
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
                      <MessageSquare className="w-4 h-4 text-muted" />
                      Contanos por qué decidiste cancelar
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="(Opcional) Escribí tu motivo aquí..."
                      rows={4}
                      className="w-full border border-hairline bg-paper px-4 py-3 text-sm text-ink resize-none focus:outline-none focus:border-ink transition-colors duration-150 rounded"
                    />
                  </div>

                  {cancelError && (
                    <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {cancelError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => { setCancelStep(CANCEL_STEPS.idle); setCancelReason(''); setCancelError('') }}
                      disabled={cancelLoading}
                      className="flex-1 btn-secondary text-sm py-3 disabled:opacity-50"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleCancelSubmit}
                      disabled={cancelLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-full text-sm transition-colors duration-150 disabled:opacity-50"
                    >
                      {cancelLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
                      ) : (
                        <><Trash2 className="w-4 h-4" /> Confirmar cancelación</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancelación exitosa */}
          <AnimatePresence>
            {cancelStep === CANCEL_STEPS.cancelled && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 border border-hairline bg-paper p-8 text-center"
                style={{ borderRadius: '4px' }}
              >
                <div className="w-14 h-14 rounded-full border border-red-200 bg-red-50 flex items-center justify-center mx-auto mb-5">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="font-display text-xl font-bold text-ink mb-2">Reserva cancelada</h2>
                <p className="text-ink-soft text-sm">
                  Nos comunicaremos con vos a la brevedad para coordinar la devolución de la seña. Gracias por tu confianza.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* Hint inicial */}
      {!searched && !booking && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center py-8 text-muted"
        >
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">El número de reserva figura en el correo de confirmación que recibiste.</p>
        </motion.div>
      )}
    </div>
  )
}

export default BookingStatusPage
