import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Calendar, LogOut, Plus, Edit, Trash2, Search, X, Save,
  MapPin, Users as UsersIcon, Bed, Bath, DollarSign, Image as ImageIcon,
  CheckCircle, Phone, Mail, CreditCard, TrendingUp, BadgeDollarSign,
  RefreshCw, AlertCircle,
} from 'lucide-react'
import { logout } from '../services/auth'
import {
  getAllApartments,
  createApartment,
  updateApartment,
  deleteApartment,
  getAllBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  completeBooking,
  cancelBooking,
  markExpiredBookingsAsCompleted,
  markBookingAsPaid,
  getDollarRate,
  setDollarRate,
  getFinanceStats,
  getDollarRateHistory,
  getAllPayments,
  getMarketRates,
} from '../services/adminApi'
import { formatDate } from '../utils/dateUtils'

const EMPTY_APARTMENT_FORM = {
  name: '',
  description: '',
  address: '',
  city: '',
  max_guests: 1,
  bedrooms: 1,
  bathrooms: 1,
  amenities: '',
  price_per_night: 0,
  images: '',
  available: true,
}

const EMPTY_BOOKING_FORM = {
  apartment_id: '',
  check_in: '',
  check_out: '',
  guests: 1,
  payment_method: 'transferencia',
  first_name: '',
  last_name: '',
  dni: '',
  phone: '',
  email: '',
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('apartments')
  const [apartments, setApartments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [processingExpired, setProcessingExpired] = useState(false)

  // Modal editar/crear apartamento
  const [showApartmentModal, setShowApartmentModal] = useState(false)
  const [isCreatingApartment, setIsCreatingApartment] = useState(false)
  const [editingApartment, setEditingApartment] = useState(null)
  const [apartmentForm, setApartmentForm] = useState(EMPTY_APARTMENT_FORM)
  const [apartmentErrors, setApartmentErrors] = useState({})
  const [apartmentSubmitting, setApartmentSubmitting] = useState(false)

  // Modal editar reserva
  const [showEditBookingModal, setShowEditBookingModal] = useState(false)
  const [editingBooking, setEditingBooking] = useState(null)
  const [editBookingForm, setEditBookingForm] = useState({})
  const [editBookingErrors, setEditBookingErrors] = useState({})
  const [editBookingSubmitting, setEditBookingSubmitting] = useState(false)

  // Modal nueva reserva
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)
  const [newBookingForm, setNewBookingForm] = useState(EMPTY_BOOKING_FORM)
  const [newBookingErrors, setNewBookingErrors] = useState({})
  const [newBookingSubmitting, setNewBookingSubmitting] = useState(false)

  // Finanzas
  const [dollarRate, setDollarRateState] = useState(0)
  const [dollarRateInput, setDollarRateInput] = useState('')
  const [dollarRateUpdatedAt, setDollarRateUpdatedAt] = useState(null)
  const [savingRate, setSavingRate] = useState(false)
  const [rateError, setRateError] = useState('')
  const [financeStats, setFinanceStats] = useState(null)
  const [financePeriod, setFinancePeriod] = useState('monthly')
  const [financeLoading, setFinanceLoading] = useState(false)
  const [payingBookingId, setPayingBookingId] = useState(null)
  const [rateHistory, setRateHistory] = useState([])
  const [payments, setPayments] = useState([])
  const [financeSubTab, setFinanceSubTab] = useState('stats')
  const [marketRates, setMarketRates] = useState([])
  const [marketRatesLoading, setMarketRatesLoading] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'apartments') {
        const response = await getAllApartments()
        setApartments(response.data || [])
      } else if (activeTab === 'bookings') {
        try { await markExpiredBookingsAsCompleted() } catch (_) { /* no bloquear */ }
        const response = await getAllBookings()
        setBookings(response.data || [])
      } else if (activeTab === 'finance') {
        const [rateData, statsData, historyData, paymentsData] = await Promise.all([
          getDollarRate().catch(() => ({ rate: 0 })),
          getFinanceStats(financePeriod).catch(() => null),
          getDollarRateHistory().catch(() => ({ data: [] })),
          getAllPayments().catch(() => ({ data: [] })),
        ])
        setDollarRateState(rateData.rate || 0)
        setDollarRateInput(rateData.rate ? String(rateData.rate) : '')
        setDollarRateUpdatedAt(rateData.updated_at || null)
        setFinanceStats(statsData)
        setRateHistory(historyData.data || [])
        setPayments(paymentsData.data || [])
        // Cotizaciones de mercado en paralelo (no bloquea si falla)
        setMarketRatesLoading(true)
        getMarketRates().then(setMarketRates).catch(() => setMarketRates([])).finally(() => setMarketRatesLoading(false))
      }
    } catch (error) {
      if (activeTab === 'apartments') setApartments([])
      else if (activeTab === 'bookings') setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // ── Apartamentos ──────────────────────────────────────────────────────────

  const handleNewApartment = () => {
    setIsCreatingApartment(true)
    setEditingApartment(null)
    setApartmentForm(EMPTY_APARTMENT_FORM)
    setApartmentErrors({})
    setShowApartmentModal(true)
  }

  const handleEditApartment = (apt) => {
    setIsCreatingApartment(false)
    setEditingApartment(apt)
    setApartmentForm({
      name: apt.name || '',
      description: apt.description || '',
      address: apt.address || '',
      city: apt.city || '',
      max_guests: apt.max_guests || 1,
      bedrooms: apt.bedrooms || 1,
      bathrooms: apt.bathrooms || 1,
      amenities: apt.amenities ? apt.amenities.join(', ') : '',
      price_per_night: apt.price_per_night || 0,
      images: apt.images ? apt.images.join(', ') : '',
      available: apt.available !== undefined ? apt.available : true,
    })
    setApartmentErrors({})
    setShowApartmentModal(true)
  }

  const handleCloseApartmentModal = () => {
    setShowApartmentModal(false)
    setEditingApartment(null)
    setIsCreatingApartment(false)
    setApartmentForm(EMPTY_APARTMENT_FORM)
    setApartmentErrors({})
  }

  const handleApartmentFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setApartmentForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (apartmentErrors[name]) setApartmentErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validateApartmentForm = () => {
    const errors = {}
    if (!apartmentForm.name?.trim()) errors.name = 'El nombre es requerido'
    if (!apartmentForm.address?.trim()) errors.address = 'La dirección es requerida'
    if (!apartmentForm.city?.trim()) errors.city = 'La ciudad es requerida'
    if (!apartmentForm.max_guests || apartmentForm.max_guests < 1) errors.max_guests = 'Mínimo 1 huésped'
    if (!apartmentForm.bedrooms || apartmentForm.bedrooms < 1) errors.bedrooms = 'Mínimo 1 habitación'
    if (!apartmentForm.bathrooms || apartmentForm.bathrooms < 1) errors.bathrooms = 'Mínimo 1 baño'
    if (!apartmentForm.price_per_night || apartmentForm.price_per_night < 0) errors.price_per_night = 'Precio inválido'
    setApartmentErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveApartment = async (e) => {
    e.preventDefault()
    if (!validateApartmentForm()) return
    setApartmentSubmitting(true)
    try {
      const data = {
        name: apartmentForm.name.trim(),
        description: apartmentForm.description.trim() || '',
        address: apartmentForm.address.trim(),
        city: apartmentForm.city.trim(),
        max_guests: parseInt(apartmentForm.max_guests),
        bedrooms: parseInt(apartmentForm.bedrooms),
        bathrooms: parseInt(apartmentForm.bathrooms),
        price_per_night: parseFloat(apartmentForm.price_per_night),
        available: apartmentForm.available,
        amenities: apartmentForm.amenities
          ? apartmentForm.amenities.split(',').map(a => a.trim()).filter(Boolean)
          : [],
        images: apartmentForm.images
          ? apartmentForm.images.split(',').map(img => img.trim()).filter(Boolean)
          : [],
      }
      if (isCreatingApartment) {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        data.owner_id = user.id || 1
        await createApartment(data)
      } else {
        await updateApartment(editingApartment.id, data)
      }
      handleCloseApartmentModal()
      await loadData()
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Error al guardar apartamento'
      alert(`Error: ${msg}`)
    } finally {
      setApartmentSubmitting(false)
    }
  }

  const handleDeleteApartment = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este apartamento?')) return
    try {
      await deleteApartment(id)
      loadData()
    } catch (_) {
      alert('Error al eliminar apartamento')
    }
  }

  // ── Reservas: editar ──────────────────────────────────────────────────────

  const handleEditBooking = (booking) => {
    setEditingBooking(booking)
    setEditBookingForm({
      apartment_id: booking.apartment_id || '',
      check_in: booking.check_in || '',
      check_out: booking.check_out || '',
      guests: booking.guests || 1,
      payment_method: booking.payment_method || 'transferencia',
      status: normalizeStatus(booking.status),
      total_price: booking.total_price || 0,
      usd_amount: booking.usd_amount ?? '',
      first_name: booking.user_info?.first_name || '',
      last_name: booking.user_info?.last_name || '',
      dni: booking.user_info?.dni || '',
      phone: booking.user_info?.phone || '',
      email: booking.user_info?.email || '',
    })
    setEditBookingErrors({})
    setShowEditBookingModal(true)
  }

  const handleCloseEditBookingModal = () => {
    setShowEditBookingModal(false)
    setEditingBooking(null)
    setEditBookingForm({})
    setEditBookingErrors({})
  }

  const handleEditBookingFormChange = (e) => {
    const { name, value } = e.target
    setEditBookingForm(prev => {
      const next = { ...prev, [name]: value }
      // Auto-recalcular USD cuando cambia ARS en una reserva pagada
      if (name === 'total_price' && editingBooking?.status === 'pagado' && editingBooking?.exchange_rate_used > 0) {
        const ars = parseFloat(value) || 0
        next.usd_amount = (ars / editingBooking.exchange_rate_used).toFixed(2)
      }
      return next
    })
    if (editBookingErrors[name]) setEditBookingErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validateEditBookingForm = () => {
    const errors = {}
    const { apartment_id, check_in, check_out, guests, payment_method, total_price, first_name, last_name, dni, phone, email } = editBookingForm
    if (!apartment_id) errors.apartment_id = 'Apartamento requerido'
    if (!check_in) errors.check_in = 'Fecha de entrada requerida'
    if (!check_out) errors.check_out = 'Fecha de salida requerida'
    if (check_in && check_out && check_out <= check_in) errors.check_out = 'La salida debe ser posterior a la entrada'
    if (!guests || Number(guests) < 1) errors.guests = 'Mínimo 1 huésped'
    if (!payment_method) errors.payment_method = 'Método de pago requerido'
    if (total_price === '' || total_price === null || Number(total_price) < 0) errors.total_price = 'Monto inválido'
    if (!first_name?.trim()) errors.first_name = 'Nombre requerido'
    if (!last_name?.trim()) errors.last_name = 'Apellido requerido'
    if (!dni?.trim()) errors.dni = 'DNI requerido'
    if (!phone?.trim()) errors.phone = 'Teléfono requerido'
    if (!email?.trim()) errors.email = 'Email requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Email inválido'
    setEditBookingErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveEditBooking = async (e) => {
    e.preventDefault()
    if (!editingBooking || !validateEditBookingForm()) return
    setEditBookingSubmitting(true)
    try {
      const payload = {
        apartment_id: Number(editBookingForm.apartment_id),
        check_in: editBookingForm.check_in,
        check_out: editBookingForm.check_out,
        guests: Number(editBookingForm.guests),
        status: editBookingForm.status,
        payment_method: editBookingForm.payment_method,
        total_price: Number(editBookingForm.total_price),
        user_info: {
          first_name: editBookingForm.first_name.trim(),
          last_name: editBookingForm.last_name.trim(),
          dni: editBookingForm.dni.trim(),
          phone: editBookingForm.phone.trim(),
          email: editBookingForm.email.trim(),
        },
      }
      if (editingBooking?.status === 'pagado' && editBookingForm.usd_amount !== '') {
        payload.usd_amount = Number(editBookingForm.usd_amount)
      }
      await updateBooking(editingBooking.id, payload)
      handleCloseEditBookingModal()
      await loadData()
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al actualizar la reserva'
      alert(msg)
    } finally {
      setEditBookingSubmitting(false)
    }
  }

  const handleDeleteBooking = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return
    try {
      await deleteBooking(id)
      loadData()
    } catch (_) {
      alert('Error al eliminar reserva')
    }
  }

  const handleCancelBooking = async (id) => {
    if (!confirm('¿Cancelar esta reserva?')) return
    try {
      await cancelBooking(id)
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al cancelar la reserva')
    }
  }

  const handleCompleteBooking = async (id) => {
    if (!confirm('¿Marcar esta reserva como concluida?')) return
    try {
      await completeBooking(id)
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al marcar la reserva como concluida')
    }
  }

  const handleChangeBookingStatus = async (id, newStatus) => {
    try {
      await updateBooking(id, { status: newStatus })
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al actualizar el estado')
    }
  }

  const handleMarkExpiredAsCompleted = async () => {
    if (!confirm('¿Marcar todas las reservas vencidas como concluidas?')) return
    setProcessingExpired(true)
    try {
      const result = await markExpiredBookingsAsCompleted()
      const count = result?.completed_count ?? 0
      alert(`Reservas vencidas marcadas como concluidas: ${count}`)
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al procesar reservas vencidas')
    } finally {
      setProcessingExpired(false)
    }
  }

  // ── Reservas: nueva ───────────────────────────────────────────────────────

  const handleNewBooking = () => {
    setNewBookingForm({
      ...EMPTY_BOOKING_FORM,
      apartment_id: apartments[0]?.id || '',
    })
    setNewBookingErrors({})
    setShowNewBookingModal(true)
  }

  const handleCloseNewBookingModal = () => {
    setShowNewBookingModal(false)
    setNewBookingForm(EMPTY_BOOKING_FORM)
    setNewBookingErrors({})
  }

  const handleNewBookingFormChange = (e) => {
    const { name, value } = e.target
    setNewBookingForm(prev => ({ ...prev, [name]: value }))
    if (newBookingErrors[name]) setNewBookingErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validateNewBookingForm = () => {
    const errors = {}
    const { apartment_id, check_in, check_out, guests, payment_method, first_name, last_name, dni, phone, email } = newBookingForm
    if (!apartment_id) errors.apartment_id = 'Seleccioná un apartamento'
    if (!check_in) errors.check_in = 'Fecha de entrada requerida'
    if (!check_out) errors.check_out = 'Fecha de salida requerida'
    if (check_in && check_out && check_out <= check_in) errors.check_out = 'La salida debe ser posterior a la entrada'
    if (!guests || Number(guests) < 1) errors.guests = 'Mínimo 1 huésped'
    if (!payment_method) errors.payment_method = 'Método de pago requerido'
    if (!first_name?.trim()) errors.first_name = 'Nombre requerido'
    if (!last_name?.trim()) errors.last_name = 'Apellido requerido'
    if (!dni?.trim()) errors.dni = 'DNI requerido'
    if (!phone?.trim()) errors.phone = 'Teléfono requerido'
    if (!email?.trim()) errors.email = 'Email requerido'
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Email inválido'
    setNewBookingErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveNewBooking = async (e) => {
    e.preventDefault()
    if (!validateNewBookingForm()) return
    setNewBookingSubmitting(true)
    try {
      const adminUser = JSON.parse(localStorage.getItem('user') || '{}')
      await createBooking({
        apartment_id: Number(newBookingForm.apartment_id),
        user_id: adminUser.id || 1,
        check_in: newBookingForm.check_in,
        check_out: newBookingForm.check_out,
        guests: Number(newBookingForm.guests),
        payment_method: newBookingForm.payment_method,
        user_info: {
          first_name: newBookingForm.first_name.trim(),
          last_name: newBookingForm.last_name.trim(),
          dni: newBookingForm.dni.trim(),
          phone: newBookingForm.phone.trim(),
          email: newBookingForm.email.trim(),
        },
      })
      handleCloseNewBookingModal()
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al crear la reserva')
    } finally {
      setNewBookingSubmitting(false)
    }
  }

  // ── Finanzas ──────────────────────────────────────────────────────────────

  const handleSaveDollarRate = async () => {
    const rate = parseFloat(dollarRateInput)
    if (isNaN(rate) || rate <= 0) { setRateError('Ingresá un valor positivo'); return }
    setSavingRate(true)
    setRateError('')
    try {
      const res = await setDollarRate(rate)
      setDollarRateState(res.rate)
      setDollarRateUpdatedAt(res.updated_at)
      // Refrescar historial de tasas
      const historyData = await getDollarRateHistory().catch(() => ({ data: [] }))
      setRateHistory(historyData.data || [])
    } catch {
      setRateError('Error al guardar el tipo de cambio')
    } finally {
      setSavingRate(false)
    }
  }

  const handleLoadFinanceStats = async (period) => {
    setFinancePeriod(period)
    setFinanceLoading(true)
    try {
      const stats = await getFinanceStats(period)
      setFinanceStats(stats)
    } catch { /* silencioso */ } finally {
      setFinanceLoading(false)
    }
  }

  const handleMarkAsPaid = async (bookingId) => {
    if (dollarRate <= 0) {
      alert('Primero configurá el tipo de cambio del dólar en el panel de Finanzas.')
      return
    }
    if (!confirm(`¿Marcar la reserva #${bookingId} como PAGADO? Se registrará al tipo de cambio $${dollarRate} ARS/USD.`)) return
    setPayingBookingId(bookingId)
    try {
      await markBookingAsPaid(bookingId, dollarRate)
      await loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Error al marcar como pagado')
    } finally {
      setPayingBookingId(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Normaliza valores de estado antiguos al nuevo modelo
  const normalizeStatus = (status) => {
    if (status === 'confirmed' || status === 'pending') return 'reservada'
    if (status === 'cancelled') return 'cancelada'
    if (status === 'concluida') return 'finalizada'
    return status || 'reservada'
  }

  const getApartmentType = (name) => {
    if (!name) return 'unknown'
    if (name.startsWith('Quadruple')) return 'quadruple'
    if (name.startsWith('Double Matrimonial')) return 'double_matrimonial'
    if (name.startsWith('Double Twin')) return 'double_twin'
    if (name.startsWith('Triple')) return 'triple'
    return 'unknown'
  }

  const getTypeDisplayName = (type) => {
    const names = {
      quadruple: 'Habitación Cuádruple',
      double_matrimonial: 'Habitación Double Matrimonial',
      double_twin: 'Habitación Double Twin',
      triple: 'Habitación Triple',
    }
    return names[type] || 'Otros'
  }

  const filteredApartments = apartments.filter(apt =>
    apt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedApartments = filteredApartments.reduce((groups, apt) => {
    const type = getApartmentType(apt.name)
    if (!groups[type]) groups[type] = []
    groups[type].push(apt)
    return groups
  }, {})

  const typeOrder = ['quadruple', 'triple', 'double_matrimonial', 'double_twin', 'unknown']
  const sortedTypes = typeOrder.filter(type => groupedApartments[type]?.length > 0)

  const filteredBookings = bookings.filter(booking =>
    booking.user_info?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.user_info?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.user_info?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(booking.id).includes(searchTerm)
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-10">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('apartments')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'apartments' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Apartamentos</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'bookings' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Reservas</span>
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'finance' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Finanzas</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-800">
              {activeTab === 'apartments' ? 'Gestión de Apartamentos'
                : activeTab === 'bookings' ? 'Gestión de Reservas'
                : 'Finanzas'}
            </h2>
            <div className="flex items-center gap-3">
              {activeTab === 'apartments' ? (
                <button
                  onClick={handleNewApartment}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nuevo Apartamento
                </button>
              ) : (
                <>
                  <button
                    onClick={handleMarkExpiredAsCompleted}
                    disabled={processingExpired}
                    className="btn-secondary flex items-center disabled:opacity-60"
                  >
                    {processingExpired ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Marcar vencidas
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleNewBooking}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nueva Reserva
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search bar — solo en apartamentos y reservas */}
          {activeTab !== 'finance' && (
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'apartments' ? 'Buscar por nombre o ciudad...' : 'Buscar por huésped, email o N° reserva...'}
                className="input-field pl-10 max-w-md"
              />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'apartments' ? (

            /* ── Apartamentos ── */
            <div className="space-y-8">
              {sortedTypes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No hay apartamentos disponibles</p>
                  {searchTerm && <p className="text-sm mt-2">Intentá con otro término de búsqueda</p>}
                </div>
              ) : (
                sortedTypes.map((type) => (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="border-b-2 border-primary-600 pb-2">
                      <h3 className="text-2xl font-bold text-gray-800">{getTypeDisplayName(type)}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {groupedApartments[type].length} {groupedApartments[type].length === 1 ? 'apartamento' : 'apartamentos'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedApartments[type].map((apt) => (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{apt.name}</h3>
                          <p className="text-gray-500 text-sm mb-3">{apt.city}</p>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-2xl font-bold text-primary-600">${apt.price_per_night}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              apt.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {apt.available ? 'Disponible' : 'No disponible'}
                            </span>
                          </div>
                          <div className="flex space-x-2 mt-4">
                            <button
                              onClick={() => handleEditApartment(apt)}
                              className="flex-1 btn-secondary text-sm py-2"
                            >
                              <Edit className="w-4 h-4 inline mr-1" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteApartment(apt.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

          ) : activeTab === 'bookings' ? (

            /* ── Reservas ── */
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Huésped</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apartamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No hay reservas disponibles
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{booking.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {booking.user_info?.first_name || 'N/A'} {booking.user_info?.last_name || ''}
                          {booking.created_by_admin && (
                            <span className="ml-2 text-xs text-blue-600">(Admin)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          Apt #{booking.apartment_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${booking.total_price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={normalizeStatus(booking.status)}
                            onChange={(e) => handleChangeBookingStatus(booking.id, e.target.value)}
                            disabled={booking.status === 'pagado' || booking.status === 'finalizada'}
                            className={`text-xs font-semibold rounded-full px-3 py-1 border focus:outline-none cursor-pointer disabled:opacity-80 disabled:cursor-default ${
                              ['reservada', 'pending', 'confirmed'].includes(booking.status) ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : booking.status === 'pagado' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : ['cancelada', 'cancelled'].includes(booking.status) ? 'bg-red-100 text-red-700 border-red-300'
                              : ['finalizada', 'concluida'].includes(booking.status) ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            }`}
                          >
                            <option value="reservada">Reservada</option>
                            <option value="pagado">Pagado</option>
                            <option value="cancelada">Cancelada</option>
                            <option value="finalizada">Finalizada</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {booking.status !== 'pagado' && booking.status !== 'cancelada' && booking.status !== 'cancelled' && booking.status !== 'finalizada' && booking.status !== 'concluida' && (
                              <button
                                onClick={() => handleMarkAsPaid(booking.id)}
                                disabled={payingBookingId === booking.id}
                                title="Marcar como PAGADO"
                                className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition-colors"
                              >
                                {payingBookingId === booking.id
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <BadgeDollarSign className="w-3 h-3" />}
                                Pago
                              </button>
                            )}
                            <button onClick={() => handleEditBooking(booking)} className="text-primary-600 hover:text-primary-700" title="Editar">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteBooking(booking.id)} className="text-red-600 hover:text-red-700" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          ) : (

            /* ── Finanzas ── */
            <div className="space-y-6">

              {/* Tipo de cambio */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                  Tipo de cambio USD
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Cada vez que guardás un nuevo valor queda registrado en el historial.
                  El valor activo se usa para convertir ARS → USD al marcar una reserva como PAGADO.
                </p>
                <div className="flex items-center gap-3 max-w-sm">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={dollarRateInput}
                      onChange={(e) => { setDollarRateInput(e.target.value); setRateError('') }}
                      placeholder="Ej: 1200"
                      className={`input-field pl-8 ${rateError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">ARS / USD</span>
                  <button
                    onClick={handleSaveDollarRate}
                    disabled={savingRate}
                    className="btn-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    {savingRate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
                {rateError && (
                  <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{rateError}
                  </p>
                )}
                {dollarRate > 0 && !rateError && (
                  <p className="text-green-600 text-sm mt-2">
                    Tipo de cambio activo: <strong>${dollarRate.toLocaleString('es-AR')} ARS/USD</strong>
                    {dollarRateUpdatedAt && (
                      <span className="ml-2 text-xs text-gray-400">
                        (configurado el {new Date(dollarRateUpdatedAt).toLocaleString('es-AR')})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Cotizaciones de mercado en tiempo real */}
              <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Cotizaciones en tiempo real
                  </h3>
                  <button
                    onClick={() => { setMarketRatesLoading(true); getMarketRates().then(setMarketRates).catch(() => {}).finally(() => setMarketRatesLoading(false)) }}
                    className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${marketRatesLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Fuente: dolarapi.com · Caché de 5 min · Hacé clic en "Usar" para cargar el valor en el TC activo.
                </p>

                {marketRatesLoading && marketRates.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Cargando cotizaciones...
                  </div>
                ) : marketRates.length === 0 ? (
                  <p className="text-sm text-gray-400">No se pudieron obtener las cotizaciones.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {marketRates.map((r) => (
                      <div key={r.casa} className="border border-gray-100 rounded-xl p-3 hover:border-primary-200 transition-colors">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{r.nombre}</p>
                        <div className="space-y-0.5 mb-3">
                          {r.compra > 0 && (
                            <p className="text-xs text-gray-500">Compra: <span className="font-medium text-gray-800">${r.compra?.toLocaleString('es-AR')}</span></p>
                          )}
                          <p className="text-xs text-gray-500">Venta: <span className="font-semibold text-gray-900">${r.venta?.toLocaleString('es-AR')}</span></p>
                        </div>
                        <button
                          onClick={() => { setDollarRateInput(String(r.venta)); setRateError('') }}
                          className="w-full text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold py-1.5 rounded-lg transition-colors"
                        >
                          Usar venta
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-tab selector */}
              <div className="flex gap-2 border-b border-gray-200 pb-0">
                {[
                  ['stats', 'Estadísticas'],
                  ['history', `Historial tasas (${rateHistory.length})`],
                  ['payments', `Pagos registrados (${payments.length})`],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFinanceSubTab(val)}
                    className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                      financeSubTab === val
                        ? 'border-primary-600 text-primary-700 bg-primary-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Sub-tab content */}
              {financeSubTab === 'stats' && (
                <div className="space-y-6">
                  {/* Period selector */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary-600" />
                      Estadísticas de ingresos
                    </h3>
                    <div className="flex gap-2">
                      {[['weekly', 'Semanal'], ['monthly', 'Mensual'], ['annual', 'Anual']].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => handleLoadFinanceStats(val)}
                          disabled={financeLoading}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            financePeriod === val
                              ? 'bg-primary-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {financeLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : financeStats ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Ingresos totales USD', value: `U$D ${financeStats.summary?.total_revenue_usd?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}`, sub: `ARS ${financeStats.summary?.total_revenue_ars?.toLocaleString('es-AR') || '0'}`, color: 'text-emerald-600' },
                          { label: 'Reservas pagadas', value: financeStats.summary?.total_paid_bookings || 0, sub: 'en total', color: 'text-primary-600' },
                          { label: 'Promedio por reserva USD', value: `U$D ${financeStats.summary?.avg_booking_usd?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0'}`, sub: `ARS ${financeStats.summary?.avg_booking_ars?.toLocaleString('es-AR') || '0'}`, color: 'text-blue-600' },
                          { label: 'Tipo de cambio activo', value: dollarRate > 0 ? `$${dollarRate.toLocaleString('es-AR')}` : 'No configurado', sub: 'ARS por USD', color: 'text-amber-600' },
                        ].map(({ label, value, sub, color }) => (
                          <div key={label} className="bg-white rounded-xl shadow-md p-5">
                            <p className="text-xs text-gray-500 mb-1">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-gray-400 mt-1">{sub}</p>
                          </div>
                        ))}
                      </div>

                      {financeStats.breakdown?.length > 0 ? (
                        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reservas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos ARS</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos USD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {financeStats.breakdown.map((item) => (
                                <tr key={item.label} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{item.label}</td>
                                  <td className="px-6 py-3 text-sm text-gray-600 text-right">{item.bookings_count}</td>
                                  <td className="px-6 py-3 text-sm text-gray-700 text-right font-medium">
                                    ${item.revenue_ars?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-3 text-sm text-emerald-700 text-right font-bold">
                                    U$D {item.revenue_usd?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-400">
                          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No hay reservas pagadas en el período seleccionado.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-md p-12 text-center text-gray-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No se pudieron cargar las estadísticas.</p>
                    </div>
                  )}
                </div>
              )}

              {financeSubTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      Historial de tipos de cambio
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cada cambio guardado queda registrado permanentemente.</p>
                  </div>
                  {rateHistory.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay historial de tasas todavía.</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa (ARS/USD)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha de registro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rateHistory.map((rec, idx) => (
                          <tr key={rec.id} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-amber-50' : ''}`}>
                            <td className="px-6 py-3 text-xs text-gray-400">
                              {idx === 0 && <span className="text-amber-600 font-semibold text-xs mr-1">ACTIVO</span>}
                              #{rec.id}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-800">
                              ${rec.rate?.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {new Date(rec.created_at).toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {financeSubTab === 'payments' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
                      Pagos registrados
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Cada pago incluye todos los datos del huésped, la reserva y el tipo de cambio utilizado.</p>
                  </div>
                  {payments.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <BadgeDollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay pagos registrados todavía.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserva</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apt.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Huésped</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estadía</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ARS</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">USD</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tasa</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">#{p.booking_id}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">#{p.apartment_id}</td>
                              <td className="px-4 py-3 text-sm text-gray-800">
                                <div className="font-medium">{p.guest_first_name} {p.guest_last_name}</div>
                                <div className="text-xs text-gray-400">{p.guest_email}</div>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">{p.guest_dni}</td>
                              <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                {p.check_in} → {p.check_out}
                                <div className="text-gray-400">{p.nights} noche{p.nights !== 1 ? 's' : ''}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right font-medium">
                                ${p.amount_ars?.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-emerald-700 text-right font-bold">
                                U$D {p.amount_usd?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-xs text-amber-700 text-right">
                                ${p.exchange_rate?.toLocaleString('es-AR')}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(p.paid_at).toLocaleString('es-AR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </motion.div>
      </div>

      {/* ── Modal Apartamento (Crear / Editar) ── */}
      <AnimatePresence>
        {showApartmentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseApartmentModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    {isCreatingApartment ? <Plus className="w-6 h-6 mr-2" /> : <Edit className="w-6 h-6 mr-2" />}
                    {isCreatingApartment ? 'Nuevo Apartamento' : 'Editar Apartamento'}
                  </h2>
                  <button onClick={handleCloseApartmentModal} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveApartment} className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                      <input type="text" name="name" value={apartmentForm.name} onChange={handleApartmentFormChange}
                        className={`input-field ${apartmentErrors.name ? 'border-red-500' : ''}`}
                        placeholder="Ej: Quadruple 1" />
                      {apartmentErrors.name && <p className="text-red-500 text-xs mt-1">{apartmentErrors.name}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea name="description" value={apartmentForm.description} onChange={handleApartmentFormChange}
                        rows="3" className="input-field" placeholder="Descripción del apartamento..." />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />Dirección *
                      </label>
                      <input type="text" name="address" value={apartmentForm.address} onChange={handleApartmentFormChange}
                        className={`input-field ${apartmentErrors.address ? 'border-red-500' : ''}`}
                        placeholder="Calle y número" />
                      {apartmentErrors.address && <p className="text-red-500 text-xs mt-1">{apartmentErrors.address}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />Ciudad *
                      </label>
                      <input type="text" name="city" value={apartmentForm.city} onChange={handleApartmentFormChange}
                        className={`input-field ${apartmentErrors.city ? 'border-red-500' : ''}`}
                        placeholder="Buenos Aires" />
                      {apartmentErrors.city && <p className="text-red-500 text-xs mt-1">{apartmentErrors.city}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <UsersIcon className="w-4 h-4 inline mr-1" />Huéspedes Máximos *
                      </label>
                      <input type="number" name="max_guests" value={apartmentForm.max_guests} onChange={handleApartmentFormChange}
                        min="1" className={`input-field ${apartmentErrors.max_guests ? 'border-red-500' : ''}`} />
                      {apartmentErrors.max_guests && <p className="text-red-500 text-xs mt-1">{apartmentErrors.max_guests}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Bed className="w-4 h-4 inline mr-1" />Habitaciones *
                      </label>
                      <input type="number" name="bedrooms" value={apartmentForm.bedrooms} onChange={handleApartmentFormChange}
                        min="1" className={`input-field ${apartmentErrors.bedrooms ? 'border-red-500' : ''}`} />
                      {apartmentErrors.bedrooms && <p className="text-red-500 text-xs mt-1">{apartmentErrors.bedrooms}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Bath className="w-4 h-4 inline mr-1" />Baños *
                      </label>
                      <input type="number" name="bathrooms" value={apartmentForm.bathrooms} onChange={handleApartmentFormChange}
                        min="1" step="0.5" className={`input-field ${apartmentErrors.bathrooms ? 'border-red-500' : ''}`} />
                      {apartmentErrors.bathrooms && <p className="text-red-500 text-xs mt-1">{apartmentErrors.bathrooms}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />Precio por Noche *
                      </label>
                      <input type="number" name="price_per_night" value={apartmentForm.price_per_night} onChange={handleApartmentFormChange}
                        min="0" step="0.01" className={`input-field ${apartmentErrors.price_per_night ? 'border-red-500' : ''}`} />
                      {apartmentErrors.price_per_night && <p className="text-red-500 text-xs mt-1">{apartmentErrors.price_per_night}</p>}
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" name="available" checked={apartmentForm.available}
                          onChange={handleApartmentFormChange}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                        <span className="ml-2 text-sm font-semibold text-gray-700 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />Disponible
                        </span>
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Amenities (separar por comas)</label>
                      <input type="text" name="amenities" value={apartmentForm.amenities} onChange={handleApartmentFormChange}
                        className="input-field" placeholder="WiFi, TV, Aire acondicionado, Cocina" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <ImageIcon className="w-4 h-4 inline mr-1" />URLs de Imágenes (separar por comas)
                      </label>
                      <input type="text" name="images" value={apartmentForm.images} onChange={handleApartmentFormChange}
                        className="input-field" placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg" />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                    <motion.button type="button" onClick={handleCloseApartmentModal}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="btn-secondary px-6" disabled={apartmentSubmitting}>
                      Cancelar
                    </motion.button>
                    <motion.button type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={apartmentSubmitting} className="btn-primary px-6 flex items-center">
                      {apartmentSubmitting ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Guardando...</>
                      ) : (
                        <><Save className="w-5 h-5 mr-2" />{isCreatingApartment ? 'Crear Apartamento' : 'Guardar Cambios'}</>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal Editar Reserva ── */}
      <AnimatePresence>
        {showEditBookingModal && editingBooking && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseEditBookingModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Edit className="w-6 h-6 mr-2" />Editar Reserva #{editingBooking.id}
                  </h2>
                  <button onClick={handleCloseEditBookingModal} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditBooking} className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Reserva */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reserva</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Apartamento *</label>
                        <select name="apartment_id" value={editBookingForm.apartment_id || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.apartment_id ? 'border-red-500' : ''}`}>
                          <option value="">Seleccioná un apartamento</option>
                          {apartments.map(apt => (
                            <option key={apt.id} value={apt.id}>
                              #{apt.id} — {apt.name} ({apt.city}) — ${apt.price_per_night}/noche
                            </option>
                          ))}
                        </select>
                        {editBookingErrors.apartment_id && <p className="text-red-500 text-xs mt-1">{editBookingErrors.apartment_id}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in *</label>
                        <input type="date" name="check_in" value={editBookingForm.check_in || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.check_in ? 'border-red-500' : ''}`} />
                        {editBookingErrors.check_in && <p className="text-red-500 text-xs mt-1">{editBookingErrors.check_in}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out *</label>
                        <input type="date" name="check_out" value={editBookingForm.check_out || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.check_out ? 'border-red-500' : ''}`} />
                        {editBookingErrors.check_out && <p className="text-red-500 text-xs mt-1">{editBookingErrors.check_out}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Huéspedes *</label>
                        <input type="number" name="guests" min="1" value={editBookingForm.guests || 1} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.guests ? 'border-red-500' : ''}`} />
                        {editBookingErrors.guests && <p className="text-red-500 text-xs mt-1">{editBookingErrors.guests}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Monto total (ARS) *</label>
                        <input type="number" name="total_price" min="0" step="0.01"
                          value={editBookingForm.total_price ?? ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.total_price ? 'border-red-500' : ''}`} />
                        {editBookingErrors.total_price && <p className="text-red-500 text-xs mt-1">{editBookingErrors.total_price}</p>}
                        <p className="text-xs text-gray-400 mt-1">Si cambiás el apartamento o las fechas, el monto se recalcula automáticamente (podés sobreescribirlo).</p>
                      </div>

                      {editingBooking?.status === 'pagado' && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Monto en USD
                            {editingBooking?.exchange_rate_used > 0 && (
                              <span className="ml-2 text-xs font-normal text-gray-400">
                                (TC al cobro: ${editingBooking.exchange_rate_used?.toLocaleString('es-AR')} ARS/USD)
                              </span>
                            )}
                          </label>
                          <input
                            type="number" name="usd_amount" min="0" step="0.01"
                            value={editBookingForm.usd_amount ?? ''}
                            onChange={handleEditBookingFormChange}
                            className="input-field"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Se recalcula automáticamente al cambiar ARS. Podés editarlo manualmente si el tipo de cambio varió.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pago *</label>
                        <select name="payment_method" value={editBookingForm.payment_method || 'transferencia'} onChange={handleEditBookingFormChange}
                          className="input-field">
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Estado *</label>
                        <select name="status" value={editBookingForm.status || 'reservada'} onChange={handleEditBookingFormChange}
                          className="input-field">
                          <option value="reservada">Reservada</option>
                          <option value="cancelada">Cancelada</option>
                          <option value="finalizada">Finalizada</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Huésped */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Datos del huésped</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                        <input type="text" name="first_name" value={editBookingForm.first_name || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.first_name ? 'border-red-500' : ''}`} />
                        {editBookingErrors.first_name && <p className="text-red-500 text-xs mt-1">{editBookingErrors.first_name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Apellido *</label>
                        <input type="text" name="last_name" value={editBookingForm.last_name || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.last_name ? 'border-red-500' : ''}`} />
                        {editBookingErrors.last_name && <p className="text-red-500 text-xs mt-1">{editBookingErrors.last_name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">DNI *</label>
                        <input type="text" name="dni" value={editBookingForm.dni || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.dni ? 'border-red-500' : ''}`} />
                        {editBookingErrors.dni && <p className="text-red-500 text-xs mt-1">{editBookingErrors.dni}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                        <input type="text" name="phone" value={editBookingForm.phone || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.phone ? 'border-red-500' : ''}`} />
                        {editBookingErrors.phone && <p className="text-red-500 text-xs mt-1">{editBookingErrors.phone}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                        <input type="email" name="email" value={editBookingForm.email || ''} onChange={handleEditBookingFormChange}
                          className={`input-field ${editBookingErrors.email ? 'border-red-500' : ''}`} />
                        {editBookingErrors.email && <p className="text-red-500 text-xs mt-1">{editBookingErrors.email}</p>}
                      </div>

                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <motion.button type="button" onClick={handleCloseEditBookingModal}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="btn-secondary px-6" disabled={editBookingSubmitting}>
                      Cancelar
                    </motion.button>
                    <motion.button type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={editBookingSubmitting} className="btn-primary px-6 flex items-center">
                      {editBookingSubmitting ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Guardando...</>
                      ) : (
                        <><Save className="w-5 h-5 mr-2" />Guardar Cambios</>
                      )}
                    </motion.button>
                  </div>

                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal Nueva Reserva ── */}
      <AnimatePresence>
        {showNewBookingModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseNewBookingModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Plus className="w-6 h-6 mr-2" />Nueva Reserva
                  </h2>
                  <button onClick={handleCloseNewBookingModal} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveNewBooking} className="flex-1 overflow-y-auto p-6 space-y-6">

                  {/* Apartamento y fechas */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Reserva</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Apartamento *</label>
                        <select name="apartment_id" value={newBookingForm.apartment_id} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.apartment_id ? 'border-red-500' : ''}`}>
                          <option value="">Seleccioná un apartamento</option>
                          {apartments.map(apt => (
                            <option key={apt.id} value={apt.id}>
                              #{apt.id} — {apt.name} ({apt.city}) — ${apt.price_per_night}/noche — Máx. {apt.max_guests} huéspedes
                            </option>
                          ))}
                        </select>
                        {newBookingErrors.apartment_id && <p className="text-red-500 text-xs mt-1">{newBookingErrors.apartment_id}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />Check-in *
                        </label>
                        <input type="date" name="check_in" value={newBookingForm.check_in} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.check_in ? 'border-red-500' : ''}`} />
                        {newBookingErrors.check_in && <p className="text-red-500 text-xs mt-1">{newBookingErrors.check_in}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />Check-out *
                        </label>
                        <input type="date" name="check_out" value={newBookingForm.check_out} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.check_out ? 'border-red-500' : ''}`} />
                        {newBookingErrors.check_out && <p className="text-red-500 text-xs mt-1">{newBookingErrors.check_out}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <UsersIcon className="w-4 h-4 inline mr-1" />Huéspedes *
                        </label>
                        <input type="number" name="guests" min="1" value={newBookingForm.guests} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.guests ? 'border-red-500' : ''}`} />
                        {newBookingErrors.guests && <p className="text-red-500 text-xs mt-1">{newBookingErrors.guests}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <CreditCard className="w-4 h-4 inline mr-1" />Método de Pago *
                        </label>
                        <select name="payment_method" value={newBookingForm.payment_method} onChange={handleNewBookingFormChange}
                          className="input-field">
                          <option value="transferencia">Transferencia</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Datos del huésped */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Datos del Huésped</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                        <input type="text" name="first_name" value={newBookingForm.first_name} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.first_name ? 'border-red-500' : ''}`} placeholder="Juan" />
                        {newBookingErrors.first_name && <p className="text-red-500 text-xs mt-1">{newBookingErrors.first_name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Apellido *</label>
                        <input type="text" name="last_name" value={newBookingForm.last_name} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.last_name ? 'border-red-500' : ''}`} placeholder="Pérez" />
                        {newBookingErrors.last_name && <p className="text-red-500 text-xs mt-1">{newBookingErrors.last_name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">DNI *</label>
                        <input type="text" name="dni" value={newBookingForm.dni} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.dni ? 'border-red-500' : ''}`} placeholder="12345678" />
                        {newBookingErrors.dni && <p className="text-red-500 text-xs mt-1">{newBookingErrors.dni}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />Teléfono *
                        </label>
                        <input type="text" name="phone" value={newBookingForm.phone} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.phone ? 'border-red-500' : ''}`} placeholder="+5491123456789" />
                        {newBookingErrors.phone && <p className="text-red-500 text-xs mt-1">{newBookingErrors.phone}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-1" />Email *
                        </label>
                        <input type="email" name="email" value={newBookingForm.email} onChange={handleNewBookingFormChange}
                          className={`input-field ${newBookingErrors.email ? 'border-red-500' : ''}`} placeholder="juan@ejemplo.com" />
                        {newBookingErrors.email && <p className="text-red-500 text-xs mt-1">{newBookingErrors.email}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <motion.button type="button" onClick={handleCloseNewBookingModal}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="btn-secondary px-6" disabled={newBookingSubmitting}>
                      Cancelar
                    </motion.button>
                    <motion.button type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      disabled={newBookingSubmitting} className="btn-primary px-6 flex items-center">
                      {newBookingSubmitting ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Creando...</>
                      ) : (
                        <><Save className="w-5 h-5 mr-2" />Crear Reserva</>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminDashboard
