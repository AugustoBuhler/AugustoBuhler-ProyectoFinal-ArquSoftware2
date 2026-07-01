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
    const timeoutId = setTimeout(() => { stopped = true; setStatus('timeout') }, TIMEOUT_MS)
    const poll = async () => {
      while (!stopped) {
        try {
          const data = await getBookingById(bookingId)
          if (data.deposit_paid) {
            clearTimeout(timeoutId)
            setBooking(data)
            setStatus('confirmed')
            try { mpWindowRef.current?.close() } catch { }
            return
          }
          if (data.status === 'cancelada' || data.status === 'cancelled') {
            clearTimeout(timeoutId)
            setStatus('failed')
            try { mpWindowRef.current?.close() } catch { }
            return
          }
        } catch { }
        await new Promise(r => setTimeout(r, POLL_MS))
      }
    }
    poll()
    return () => { stopped = true; clearTimeout(timeoutId) }
  }, [bookingId])

  if (!bookingId) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-muted">Reserva no encontrada.</div>
  }

  const typeLabel = TYPE_LABELS[apartmentType] || apartmentType || 'Apartamento'
  const backToBookingPath = apartmentType ? `/booking?type=${apartmentType}` : '/'

  const handleVerify = async () => {
    setVerifying(true); setVerifyError('')
    try {
      await verifyPayment(bookingId)
    } catch (e) {
      setVerifyError(e.response?.data?.error || 'No se encontró un pago aprobado. Verificá que hayas completado el pago en la otra pestaña.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 sm:px-10 py-16 text-center">
      <AnimatePresence mode="wait">

        {/* WAITING */}
        {status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="border border-hairline bg-paper p-10"
            style={{ borderRadius: '4px' }}
          >
            <div className="w-16 h-16 rounded-full border border-hairline bg-[#efece6] flex items-center justify-center mx-auto mb-6">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <Loader2 className="w-8 h-8 text-primary-600" />
              </motion.div>
            </div>
            <h1 className="font-display text-[22px] font-bold text-ink mb-3">Esperando confirmación de pago</h1>
            <p className="text-ink-soft text-sm mb-2">El checkout de Mercado Pago se abrió en otra pestaña.</p>
            <p className="text-muted text-sm mb-6">Completá el pago allí. Esta página se actualizará sola.</p>
            <p className="text-sm text-muted mb-4">Reserva <span className="font-semibold text-ink">#{bookingId}</span></p>
            {initPoint && (
              <a href={decodeURIComponent(initPoint)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium hover:border-b hover:border-primary-600 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Mercado Pago de nuevo
              </a>
            )}

            <div className="mt-6 pt-6 border-t border-hairline">
              <p className="text-xs text-muted mb-3">¿Ya completaste el pago y esta página no se actualizó?</p>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-2 btn-primary text-sm py-2.5 px-5 disabled:opacity-50"
              >
                {verifying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                  : <><RefreshCw className="w-4 h-4" /> Ya pagué — verificar ahora</>
                }
              </button>
              {verifyError && <p className="mt-2 text-xs text-red-500">{verifyError}</p>}
            </div>
          </motion.div>
        )}

        {/* CONFIRMED */}
        {status === 'confirmed' && booking && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="border border-hairline bg-paper overflow-hidden"
            style={{ borderRadius: '4px' }}
          >
            <div className="bg-ink px-8 py-8 text-center">
              <div className="w-14 h-14 rounded-full border border-paper/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-paper" />
              </div>
              <h1 className="font-display text-[22px] font-bold text-paper mb-1">¡Seña confirmada!</h1>
              <p className="text-paper/50 text-sm">Recibirás un email con todos los detalles</p>
            </div>

            <div className="px-8 pt-6 pb-2 text-center">
              <div className="inline-block border border-primary-200 bg-primary-50 px-6 py-3" style={{ borderRadius: '4px' }}>
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-1">Número de reserva</p>
                <p className="font-display text-3xl font-bold text-primary-600">#{booking.id}</p>
              </div>
            </div>

            <div className="px-8 py-4">
              <div className="border border-hairline overflow-hidden divide-y divide-hairline text-left" style={{ borderRadius: '4px' }}>
                {[
                  { Icon: Tag,        label: 'Tipo',          value: `Habitación ${typeLabel}` },
                  { Icon: Calendar,   label: 'Check-in',      value: formatDate(booking.check_in) },
                  { Icon: Calendar,   label: 'Check-out',     value: formatDate(booking.check_out) },
                  { Icon: Users,      label: 'Huéspedes',     value: `${booking.guests} persona${booking.guests !== 1 ? 's' : ''}` },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 bg-paper">
                    <Icon className="w-4 h-4 text-muted flex-shrink-0" />
                    <span className="text-sm text-ink-soft w-32">{label}</span>
                    <span className="text-sm font-semibold text-ink">{value}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 px-4 py-3 bg-primary-50">
                  <CreditCard className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span className="text-sm text-primary-700 w-32">Total reserva</span>
                  <span className="text-sm font-bold text-primary-700">{formatPrice(booking.total_price)}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 w-32">Seña pagada (30%)</span>
                  <span className="text-sm font-bold text-emerald-700">−{formatPrice(booking.deposit_amount)}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-paper">
                  <span className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm text-ink-soft w-32">Saldo al ingreso</span>
                  <span className="text-sm font-semibold text-ink">{formatPrice(booking.total_price - booking.deposit_amount)}</span>
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 btn-primary text-sm py-3"
              >
                Volver a Inicio
              </button>
              <button
                onClick={() => navigate(`/booking-status?id=${booking.id}`)}
                className="flex-1 btn-secondary text-sm py-3"
              >
                Ver mi reserva
              </button>
            </div>
          </motion.div>
        )}

        {/* FAILED / TIMEOUT */}
        {(status === 'failed' || status === 'timeout') && (
          <motion.div key="failed" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="border border-hairline bg-paper p-10"
            style={{ borderRadius: '4px' }}
          >
            <div className="w-16 h-16 rounded-full border border-red-200 bg-red-50 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="font-display text-[22px] font-bold text-ink mb-3">
              {status === 'timeout' ? 'Tiempo de espera agotado' : 'Pago no procesado'}
            </h1>
            <p className="text-ink-soft text-sm mb-8">
              {status === 'timeout'
                ? 'No se detectó confirmación del pago. Podés intentarlo de nuevo.'
                : 'Hubo un problema con el pago. No se realizó ningún cargo.'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-sm py-3 px-6"
            >
              Volver a Inicio
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

export default PaymentWaitingPage
