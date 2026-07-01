import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { triggerPaymentWebhook } from '../services/api'

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams()
  const status    = searchParams.get('status') || 'failure'
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')

  useEffect(() => {
    if (status === 'approved' && paymentId) {
      triggerPaymentWebhook(paymentId)
        .catch(() => {})
        .finally(() => {
          setTimeout(() => window.close(), 800)
        })
    }
  }, [])

  const card = (icon, title, subtitle, spinner = false) => (
    <div className="max-w-sm mx-auto px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border border-hairline bg-paper p-10"
        style={{ borderRadius: '4px' }}
      >
        {icon}
        <h1 className="font-display text-[20px] font-bold text-ink mb-2">{title}</h1>
        <p className="text-ink-soft text-sm mb-4">{subtitle}</p>
        {spinner && (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block">
            <Loader2 className="w-5 h-5 text-primary-600 mx-auto" />
          </motion.div>
        )}
      </motion.div>
    </div>
  )

  if (status === 'approved') {
    return card(
      <div className="w-14 h-14 rounded-full border border-primary-200 bg-primary-50 flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-7 h-7 text-primary-600" />
      </div>,
      '¡Pago confirmado!',
      'Volviendo a la aplicación…',
      true
    )
  }

  if (status === 'pending') {
    return card(
      <div className="w-14 h-14 rounded-full border border-yellow-200 bg-yellow-50 flex items-center justify-center mx-auto mb-5">
        <Clock className="w-7 h-7 text-yellow-500" />
      </div>,
      'Pago en proceso',
      'Te notificaremos por email cuando se confirme.'
    )
  }

  return card(
    <div className="w-14 h-14 rounded-full border border-red-200 bg-red-50 flex items-center justify-center mx-auto mb-5">
      <XCircle className="w-7 h-7 text-red-500" />
    </div>,
    'Pago rechazado',
    'No se realizó ningún cargo. Podés cerrar esta pestaña e intentarlo nuevamente.'
  )
}

export default PaymentResultPage
