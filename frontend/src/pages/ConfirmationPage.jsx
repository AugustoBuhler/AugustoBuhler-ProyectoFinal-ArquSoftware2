import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, Users, DollarSign } from 'lucide-react'
import { getBookingById } from '../services/api'
import { formatDate } from '../utils/dateUtils'

const ConfirmationPage = () => {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const data = await getBookingById(bookingId)
        if (data.check_in instanceof Date) data.check_in = data.check_in.toISOString().split('T')[0]
        if (data.check_out instanceof Date) data.check_out = data.check_out.toISOString().split('T')[0]
        setBooking(data)
      } catch (error) {
        console.error('Error loading booking:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBooking()
  }, [bookingId])

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

  if (!booking) {
    return (
      <div className="max-w-6xl mx-auto px-10 py-8">
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm">
          Reserva no encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-10 py-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-block mb-5"
        >
          <CheckCircle className="w-20 h-20 text-primary-600" />
        </motion.div>
        <h1 className="font-display font-bold text-ink text-[36px] tracking-tight mb-2">
          ¡Reserva Confirmada!
        </h1>
        <p className="text-ink-soft text-lg">Tu reserva ha sido procesada exitosamente</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="border border-hairline bg-paper p-8 mb-8"
        style={{ borderRadius: '4px' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[
            { Icon: Calendar, label: 'Check-in', value: formatDate(booking.check_in) },
            { Icon: Calendar, label: 'Check-out', value: formatDate(booking.check_out) },
            { Icon: Users,    label: 'Huéspedes', value: booking.guests },
            { Icon: DollarSign, label: 'Total Pagado', value: `$${booking.total_price?.toLocaleString('es-AR')}` },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted mb-0.5">{label}</p>
                <p className="font-semibold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-hairline pt-6">
          <h3 className="font-display text-base font-bold text-ink mb-4">Datos del Huésped</h3>
          <div className="space-y-1.5 text-ink-soft text-sm">
            <p><span className="font-semibold text-ink">Nombre:</span> {booking.user_info.first_name} {booking.user_info.last_name}</p>
            <p><span className="font-semibold text-ink">DNI:</span> {booking.user_info.dni}</p>
            <p><span className="font-semibold text-ink">Teléfono:</span> {booking.user_info.phone}</p>
            <p><span className="font-semibold text-ink">Email:</span> {booking.user_info.email}</p>
            <p><span className="font-semibold text-ink">Método de Pago:</span> {booking.payment_method === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo'}</p>
          </div>
        </div>

        <div className="mt-6 border border-hairline bg-[#efece6] px-5 py-4 rounded-sm">
          <p className="text-sm text-ink">
            <span className="font-semibold">Número de Reserva:</span> #{booking.id}
          </p>
          <p className="text-xs text-muted mt-1">Guardá este número para futuras consultas</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-center"
      >
        <Link to="/" className="btn-primary text-base px-8 py-4">
          Volver a Inicio
        </Link>
      </motion.div>
    </div>
  )
}

export default ConfirmationPage
