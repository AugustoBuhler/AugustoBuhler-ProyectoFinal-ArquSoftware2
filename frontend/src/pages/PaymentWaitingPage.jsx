import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, ExternalLink, Calendar, Users, CreditCard, Tag, RefreshCw } from 'lucide-react'
import { getBookingById, verifyPayment } from '../services/api'

const POLL_MS = 3000
const TIMEOUT_MS = 10 * 60 * 1000

const TYPE_LABELS = {
  simple: 'Simple',
  doble: 'Doble',
  triple: 'Triple',
  cuadruple: 'Cuádruple',
}

const formatDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const formatPrice = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const PaymentWaitingPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const bookingId = searchParams.get('id')
  const initPoint = searchParams.get('mp')
  const apartmentType = searchParams.get('type')

  const [status, setStatus] = useState('waiting')
  const [booking, setBooking] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const mpWindowRef = useRef(null)

  useEffect(() => {
    if (initPoint) {
      mpWindowRef.current = window.open(decodeURIComponent(initPoint), '_blank')
    }
  }, [initPoint])

  useEffect(() => {
    if (!bookingId) return
    let stopped = false

    const timeoutId = setTimeout(() => {
      stopped = true
      setStatus('timeout')
    }, TIMEOUT_MS)

    const poll = async () => {
      while (!stopped) {
        try {
          const data = await getBookingById(bookingId)
          if (data.deposit_paid) {
            clearTimeout(timeoutId)
            setBooking(data)
            setStatus('confirmed')
            try { mpWindowRef.current?.close() } catch { /* cross-origin close blocked */ }
            return
          }
          if (data.status === 'cancelada' || data.status === 'cancelled') {
            clearTimeout(timeoutId)
            setStatus('failed')
            try { mpWindowRef.current?.close() } catch { /* ignore */ }
            return
          }
        } catch { /* retry silently */ }
        await new Promise(r => setTimeout(r, POLL_MS))
      }
    }

    poll()
    return () => { stopped = true; clearTimeout(timeoutId) }
  }, [bookingId])

  if (!bookingId) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-500">Reserva no encontrada.</div>
  }

  const typeLabel = TYPE_LABELS[apartmentType] || apartmentType || 'Apartamento'
  const backToBookingPath = apartmentType ? `/booking?type=${apartmentType}` : '/'

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyError('')
    try {
      await verifyPayment(bookingId)
      // el polling detectará deposit_paid=true en el próximo ciclo
    } catch (e) {
      setVerifyError(e.response?.data?.error || 'No se encontró un pago aprobado. Verificá que hayas completado el pago en la otra pestaña.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <AnimatePresence mode="wait">

        {/* ── WAITING ── */}
        {status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl p-10"
          >
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <Loader2 className="w-10 h-10 text-indigo-600" />
              </motion.div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Esperando confirmación de pago</h1>
            <p className="text-gray-500 mb-2">El checkout de Mercado Pago se abrió en otra pestaña.</p>
            <p className="text-gray-400 text-sm mb-6">Completá el pago allí. Esta página se actualizará sola.</p>
            <p className="text-sm text-gray-400 mb-4">Reserva <span className="font-semibold text-gray-600">#{bookingId}</span></p>
            {initPoint && (
              <a href={decodeURIComponent(initPoint)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-600 text-sm font-medium hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Mercado Pago de nuevo
              </a>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">¿Ya completaste el pago y esta página no se actualizó?</p>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {verifying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  : <><RefreshCw className="w-4 h-4" /> Ya pagué — verificar ahora</>
                }
              </button>
              {verifyError && (
                <p className="mt-2 text-xs text-red-500">{verifyError}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CONFIRMED ── */}
        {status === 'confirmed' && booking && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">¡Seña confirmada!</h1>
              <p className="text-emerald-100 text-sm">Recibirás un email con todos los detalles</p>
            </div>

            {/* Booking ID */}
            <div className="px-8 pt-6 pb-2 text-center">
              <div className="inline-block bg-emerald-50 border-2 border-emerald-200 rounded-xl px-6 py-3">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Número de reserva</p>
                <p className="text-3xl font-extrabold text-emerald-700">#{booking.id}</p>
              </div>
            </div>

            {/* Details */}
            <div className="px-8 py-4">
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200 text-left">

                <div className="flex items-center gap-3 px-4 py-3">
                  <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 w-32">Tipo</span>
                  <span className="text-sm font-semibold text-gray-800">Habitación {typeLabel}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 w-32">Check-in</span>
                  <span className="text-sm font-semibold text-gray-800">{formatDate(booking.check_in)}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 w-32">Check-out</span>
                  <span className="text-sm font-semibold text-gray-800">{formatDate(booking.check_out)}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-500 w-32">Huéspedes</span>
                  <span className="text-sm font-semibold text-gray-800">{booking.guests} persona{booking.guests !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-amber-50">
                  <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-700 w-32">Total reserva</span>
                  <span className="text-sm font-bold text-amber-700">{formatPrice(booking.total_price)}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-emerald-700 w-32">Seña pagada (30%)</span>
                  <span className="text-sm font-bold text-emerald-700">−{formatPrice(booking.deposit_amount)}</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-4 h-4 shrink-0" />
                  <span className="text-sm text-gray-500 w-32">Saldo al ingreso</span>
                  <span className="text-sm font-semibold text-gray-800">{formatPrice(booking.total_price - booking.deposit_amount)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 pt-2 flex flex-col sm:flex-row gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/')}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Volver a Inicio
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/booking-status?id=${booking.id}`)}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Ver mi reserva
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── FAILED / TIMEOUT ── */}
        {(status === 'failed' || status === 'timeout') && (
          <motion.div key="failed" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="bg-white rounded-2xl shadow-xl p-10"
          >
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {status === 'timeout' ? 'Tiempo de espera agotado' : 'Pago no procesado'}
            </h1>
            <p className="text-gray-600 mb-8">
              {status === 'timeout'
                ? 'No se detectó confirmación del pago. Podés intentarlo de nuevo.'
                : 'Hubo un problema con el pago. No se realizó ningún cargo.'}
            </p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Volver a Inicio
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

export default PaymentWaitingPage
