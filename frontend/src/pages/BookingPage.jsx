import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, User, Mail, Phone, CreditCard, ArrowLeft } from 'lucide-react'
import { getApartmentById, createBooking } from '../services/api'
import { format } from 'date-fns'

const BookingPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [apartment, setApartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

  useEffect(() => {
    const loadApartment = async () => {
      try {
        const data = await getApartmentById(id)
        setApartment(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadApartment()
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    // Limpiar error del campo
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      })
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      const bookingData = {
        apartment_id: parseInt(id),
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
      }

      const booking = await createBooking(bookingData)
      navigate(`/confirmation/${booking.id}`)
    } catch (error) {
      console.error('Error creating booking:', error)
      alert(error.response?.data?.error || 'Error al crear la reserva. Por favor, intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

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
          Apartamento no encontrado
        </div>
      </div>
    )
  }

  const calculateNights = () => {
    if (formData.check_in && formData.check_out) {
      const checkIn = new Date(formData.check_in)
      const checkOut = new Date(formData.check_out)
      const diffTime = Math.abs(checkOut - checkIn)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? diffDays : 0
    }
    return 0
  }

  const nights = calculateNights()
  const totalPrice = nights * apartment.price_per_night

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Completa tu Reserva</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fechas de Estancia
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Check-in</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="date"
                        name="check_in"
                        value={formData.check_in}
                        onChange={handleChange}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className={`input-field pl-10 ${errors.check_in ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.check_in && (
                      <p className="text-red-500 text-xs mt-1">{errors.check_in}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Check-out</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="date"
                        name="check_out"
                        value={formData.check_out}
                        onChange={handleChange}
                        min={formData.check_in || format(new Date(), 'yyyy-MM-dd')}
                        className={`input-field pl-10 ${errors.check_out ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.check_out && (
                      <p className="text-red-500 text-xs mt-1">{errors.check_out}</p>
                    )}
                  </div>
                </div>
              </div>

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
                  max={apartment.max_guests}
                  className={`input-field ${errors.guests ? 'border-red-500' : ''}`}
                />
                {errors.guests && (
                  <p className="text-red-500 text-xs mt-1">{errors.guests}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Máximo {apartment.max_guests} huéspedes
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Datos del Huésped</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.first_name ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                    )}
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
                    {errors.last_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                    )}
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
                  {errors.dni && (
                    <p className="text-red-500 text-xs mt-1">{errors.dni}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Método de Pago</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                  {errors.payment_method && (
                    <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="btn-primary w-full text-lg py-4"
              >
                {submitting ? 'Procesando...' : 'Confirmar Reserva'}
              </motion.button>
            </form>
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6 sticky top-24"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Resumen</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800">{apartment.name}</h4>
              <p className="text-sm text-gray-600">{apartment.city}</p>
            </div>

            <div className="border-t border-b py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Precio por noche</span>
                <span className="font-semibold">${apartment.price_per_night}</span>
              </div>
              {nights > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Noches</span>
                    <span className="font-semibold">{nights}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary-600">${totalPrice.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {nights === 0 && (
              <p className="text-sm text-gray-500 mt-4">
                Selecciona las fechas para ver el total
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default BookingPage

