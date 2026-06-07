import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { triggerPaymentWebhook } from '../services/api'

// Esta página solo se abre en la pestaña secundaria de MP.
// Si el pago fue aprobado, dispara el webhook localmente y cierra la pestaña.
// La pestaña principal (PaymentWaitingPage) detecta el cambio vía polling.

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams()
  const status   = searchParams.get('status') || 'failure'
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const bookingId = searchParams.get('booking_id')

  useEffect(() => {
    if (status === 'approved' && paymentId) {
      triggerPaymentWebhook(paymentId)
        .catch(() => {})
        .finally(() => {
          // Intentar cerrar esta pestaña (abierta por window.open en PaymentWaitingPage)
          setTimeout(() => window.close(), 800)
        })
    }
  }, [])

  if (status === 'approved') {
    return (
      <div className="max-w-sm mx-auto px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-10"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">¡Pago confirmado!</h1>
          <p className="text-gray-500 text-sm mb-4">Volviendo a la aplicación…</p>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block">
            <Loader2 className="w-5 h-5 text-emerald-500 mx-auto" />
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="max-w-sm mx-auto px-4 py-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-10"
        >
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-9 h-9 text-yellow-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Pago en proceso</h1>
          <p className="text-gray-500 text-sm">Te notificaremos por email cuando se confirme.</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-24 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-10"
      >
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-9 h-9 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pago rechazado</h1>
        <p className="text-gray-500 text-sm mb-4">No se realizó ningún cargo. Podés cerrar esta pestaña e intentarlo nuevamente.</p>
      </motion.div>
    </div>
  )
}

export default PaymentResultPage
