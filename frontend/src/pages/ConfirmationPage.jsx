import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import { getBookingById } from '../services/api'
import { formatDate } from '../utils/dateUtils'

const ConfirmationPage = () => {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBooking = async () => {
      try {
        // Obtener datos de la reserva directamente desde la API (base de datos)
        const data = await getBookingById(bookingId)
        // Normalizar fechas a string YYYY-MM-DD por si axios las convirtió a Date
        if (data.check_in instanceof Date) {
          data.check_in = data.check_in.toISOString().split('T')[0]
        }
        if (data.check_out instanceof Date) {
          data.check_out = data.check_out.toISOString().split('T')[0]
        }
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
      <div className="flex justify-center items-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Reserva no encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-block mb-4"
        >
          <CheckCircle className="w-24 h-24 text-green-500" />
        </motion.div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          ¡Reserva Confirmada!
        </h1>
        <p className="text-xl text-gray-600">
          Tu reserva ha sido procesada exitosamente
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-xl p-8 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-start space-x-3">
            <Calendar className="w-6 h-6 text-primary-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-semibold text-gray-800">
                {formatDate(booking.check_in)}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Calendar className="w-6 h-6 text-primary-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-semibold text-gray-800">
                {formatDate(booking.check_out)}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Users className="w-6 h-6 text-primary-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Huéspedes</p>
              <p className="font-semibold text-gray-800">{booking.guests}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <DollarSign className="w-6 h-6 text-primary-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Total Pagado</p>
              <p className="font-semibold text-gray-800">${booking.total_price}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Datos del Huésped</h3>
          <div className="space-y-2 text-gray-700">
            <p><span className="font-semibold">Nombre:</span> {booking.user_info.first_name} {booking.user_info.last_name}</p>
            <p><span className="font-semibold">DNI:</span> {booking.user_info.dni}</p>
            <p><span className="font-semibold">Teléfono:</span> {booking.user_info.phone}</p>
            <p><span className="font-semibold">Email:</span> {booking.user_info.email}</p>
            <p><span className="font-semibold">Método de Pago:</span> {booking.payment_method === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo'}</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Número de Reserva:</span> #{booking.id}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Guarda este número para futuras consultas
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center"
      >
        <Link to="/" className="btn-primary inline-block">
          Volver a Buscar Apartamentos
        </Link>
      </motion.div>
    </div>
  )
}

export default ConfirmationPage

