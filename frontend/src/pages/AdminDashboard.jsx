import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Calendar, Users, Settings, LogOut, Plus, Edit, Trash2, Search, X, Save, MapPin, Users as UsersIcon, Bed, Bath, DollarSign, Image as ImageIcon, CheckCircle } from 'lucide-react'
import { logout } from '../services/auth'
import { getAllApartments, createApartment, updateApartment, deleteApartment } from '../services/adminApi'
import { getAllBookings, updateBooking, deleteBooking } from '../services/adminApi'
import { formatDate } from '../utils/dateUtils'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('apartments')
  const [apartments, setApartments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingApartment, setEditingApartment] = useState(null)
  const [formData, setFormData] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
      } else {
        const response = await getAllBookings()
        setBookings(response.data || [])
        if (response.data && response.data.length === 0) {
          // Si no hay reservas, inicializar como array vacío
          setBookings([])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Inicializar arrays vacíos en caso de error
      if (activeTab === 'apartments') {
        setApartments([])
      } else {
        setBookings([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const handleDeleteApartment = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este apartamento?')) return
    
    try {
      await deleteApartment(id)
      loadData()
    } catch (error) {
      alert('Error al eliminar apartamento')
    }
  }

  const handleDeleteBooking = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return
    
    try {
      await deleteBooking(id)
      loadData()
    } catch (error) {
      alert('Error al eliminar reserva')
    }
  }

  // Funciones para manejar edición de apartamentos
  const handleEditApartment = (apartment) => {
    console.log('🖊️ Editando apartamento:', apartment)
    setEditingApartment(apartment)
    setFormData({
      name: apartment.name || '',
      description: apartment.description || '',
      address: apartment.address || '',
      city: apartment.city || '',
      max_guests: apartment.max_guests || 1,
      bedrooms: apartment.bedrooms || 1,
      bathrooms: apartment.bathrooms || 1,
      amenities: apartment.amenities ? apartment.amenities.join(', ') : '',
      price_per_night: apartment.price_per_night || 0,
      images: apartment.images ? apartment.images.join(', ') : '',
      available: apartment.available !== undefined ? apartment.available : true,
    })
    setFormErrors({})
    setShowModal(true)
    console.log('✅ Modal abierto, showModal:', true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingApartment(null)
    setFormData({})
    setFormErrors({})
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'El nombre es requerido'
    }
    if (!formData.address || formData.address.trim() === '') {
      errors.address = 'La dirección es requerida'
    }
    if (!formData.city || formData.city.trim() === '') {
      errors.city = 'La ciudad es requerida'
    }
    if (!formData.max_guests || formData.max_guests < 1) {
      errors.max_guests = 'Debe haber al menos 1 huésped'
    }
    if (!formData.bedrooms || formData.bedrooms < 1) {
      errors.bedrooms = 'Debe haber al menos 1 habitación'
    }
    if (!formData.bathrooms || formData.bathrooms < 1) {
      errors.bathrooms = 'Debe haber al menos 1 baño'
    }
    if (!formData.price_per_night || formData.price_per_night < 0) {
      errors.price_per_night = 'El precio debe ser mayor o igual a 0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveApartment = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      // Preparar datos para enviar al backend
      // El backend espera campos opcionales (punteros), así que enviaremos todos los campos
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        address: formData.address.trim(),
        city: formData.city.trim(),
        max_guests: parseInt(formData.max_guests),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        price_per_night: parseFloat(formData.price_per_night),
        available: formData.available,
      }

      // Procesar amenities (separar por comas y convertir a array)
      if (formData.amenities && formData.amenities.trim() !== '') {
        updateData.amenities = formData.amenities.split(',').map(a => a.trim()).filter(a => a !== '')
      } else {
        updateData.amenities = []
      }

      // Procesar images (separar por comas y convertir a array)
      if (formData.images && formData.images.trim() !== '') {
        updateData.images = formData.images.split(',').map(img => img.trim()).filter(img => img !== '')
      } else {
        updateData.images = []
      }

      console.log('Enviando datos de actualización:', updateData)
      
      // Llamar a la API para actualizar en la base de datos
      const updatedApartment = await updateApartment(editingApartment.id, updateData)
      console.log('Apartamento actualizado exitosamente:', updatedApartment)
      
      handleCloseModal()
      // Recargar lista de apartamentos para reflejar los cambios
      await loadData()
    } catch (error) {
      console.error('Error updating apartment:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Error al actualizar apartamento'
      alert(`Error: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Función helper para obtener el tipo de apartamento desde el nombre
  const getApartmentType = (name) => {
    if (!name) return 'unknown'
    if (name.startsWith('Quadruple')) return 'quadruple'
    if (name.startsWith('Double Matrimonial')) return 'double_matrimonial'
    if (name.startsWith('Double Twin')) return 'double_twin'
    if (name.startsWith('Triple')) return 'triple'
    return 'unknown'
  }

  // Función helper para obtener el nombre para mostrar del tipo
  const getTypeDisplayName = (type) => {
    switch (type) {
      case 'quadruple': return 'Habitación Cuádruple'
      case 'double_matrimonial': return 'Habitación Double Matrimonial'
      case 'double_twin': return 'Habitación Double Twin'
      case 'triple': return 'Habitación Triple'
      default: return 'Otros'
    }
  }

  // Filtrar apartamentos por búsqueda
  const filteredApartments = apartments.filter(apt =>
    apt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.city.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar apartamentos por tipo
  const groupedApartments = filteredApartments.reduce((groups, apt) => {
    const type = getApartmentType(apt.name)
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(apt)
    return groups
  }, {})

  // Orden de tipos para mostrar
  const typeOrder = ['quadruple', 'triple', 'double_matrimonial', 'double_twin', 'unknown']
  
  // Ordenar tipos según el orden deseado
  const sortedTypes = typeOrder.filter(type => groupedApartments[type] && groupedApartments[type].length > 0)

  // Debug: Verificar agrupación
  console.log('🔍 Debug - Apartamentos filtrados:', filteredApartments.length)
  console.log('🔍 Debug - Tipos agrupados:', Object.keys(groupedApartments))
  console.log('🔍 Debug - Tipos ordenados:', sortedTypes)
  console.log('🔍 Debug - Agrupación completa:', groupedApartments)

  const filteredBookings = bookings.filter(booking =>
    booking.user_info?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.user_info?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-800">
              {activeTab === 'apartments' ? 'Gestión de Apartamentos' : 'Gestión de Reservas'}
            </h2>
            {activeTab === 'apartments' && (
              <button
                onClick={() => navigate('/')}
                className="btn-secondary flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ver Sitio Público
              </button>
            )}
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="input-field pl-10 max-w-md"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'apartments' ? (
            <div className="space-y-8">
              {sortedTypes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No hay apartamentos disponibles</p>
                  {searchTerm && <p className="text-sm mt-2">Intenta con otro término de búsqueda</p>}
                </div>
              ) : (
                sortedTypes.map((type) => (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Título de la sección */}
                    <div className="border-b-2 border-primary-600 pb-2">
                      <h3 className="text-2xl font-bold text-gray-800">
                        {getTypeDisplayName(type)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {groupedApartments[type].length} {groupedApartments[type].length === 1 ? 'apartamento' : 'apartamentos'}
                      </p>
                    </div>

                    {/* Grid de apartamentos del tipo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedApartments[type].map((apt) => (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 className="text-xl font-bold text-gray-800 mb-2">{apt.name}</h3>
                          <p className="text-gray-600 text-sm mb-4">{apt.city}</p>
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
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🖱️ Click en botón Editar para apartamento:', apt.id)
                                handleEditApartment(apt)
                              }}
                              className="flex-1 btn-secondary text-sm py-2 cursor-pointer active:scale-95 transition-transform"
                            >
                              <Edit className="w-4 h-4 inline mr-1" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteApartment(apt.id)
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer active:scale-95"
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
          ) : (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{booking.id}
                        </td>
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
                          {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${booking.total_price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {booking.status || 'confirmed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button className="text-primary-600 hover:text-primary-700">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de Edición de Apartamento */}
      <AnimatePresence>
        {showModal && editingApartment && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Edit className="w-6 h-6 mr-2" />
                    Editar Apartamento
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveApartment} className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre del Apartamento *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleFormChange}
                        className={`input-field ${formErrors.name ? 'border-red-500' : ''}`}
                        placeholder="Ej: Quadruple 1"
                      />
                      {formErrors.name && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    {/* Descripción */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Descripción
                      </label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleFormChange}
                        rows="3"
                        className={`input-field ${formErrors.description ? 'border-red-500' : ''}`}
                        placeholder="Descripción del apartamento..."
                      />
                      {formErrors.description && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                      )}
                    </div>

                    {/* Dirección */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Dirección *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address || ''}
                        onChange={handleFormChange}
                        className={`input-field ${formErrors.address ? 'border-red-500' : ''}`}
                        placeholder="Calle y número"
                      />
                      {formErrors.address && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                      )}
                    </div>

                    {/* Ciudad */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Ciudad *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleFormChange}
                        className={`input-field ${formErrors.city ? 'border-red-500' : ''}`}
                        placeholder="Buenos Aires"
                      />
                      {formErrors.city && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    {/* Huéspedes Máximos */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Huéspedes Máximos *
                      </label>
                      <input
                        type="number"
                        name="max_guests"
                        value={formData.max_guests || ''}
                        onChange={handleFormChange}
                        min="1"
                        className={`input-field ${formErrors.max_guests ? 'border-red-500' : ''}`}
                      />
                      {formErrors.max_guests && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.max_guests}</p>
                      )}
                    </div>

                    {/* Habitaciones */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Bed className="w-4 h-4 inline mr-1" />
                        Habitaciones *
                      </label>
                      <input
                        type="number"
                        name="bedrooms"
                        value={formData.bedrooms || ''}
                        onChange={handleFormChange}
                        min="1"
                        className={`input-field ${formErrors.bedrooms ? 'border-red-500' : ''}`}
                      />
                      {formErrors.bedrooms && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.bedrooms}</p>
                      )}
                    </div>

                    {/* Baños */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Bath className="w-4 h-4 inline mr-1" />
                        Baños *
                      </label>
                      <input
                        type="number"
                        name="bathrooms"
                        value={formData.bathrooms || ''}
                        onChange={handleFormChange}
                        min="1"
                        step="0.5"
                        className={`input-field ${formErrors.bathrooms ? 'border-red-500' : ''}`}
                      />
                      {formErrors.bathrooms && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.bathrooms}</p>
                      )}
                    </div>

                    {/* Precio por Noche */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Precio por Noche *
                      </label>
                      <input
                        type="number"
                        name="price_per_night"
                        value={formData.price_per_night || ''}
                        onChange={handleFormChange}
                        min="0"
                        step="0.01"
                        className={`input-field ${formErrors.price_per_night ? 'border-red-500' : ''}`}
                      />
                      {formErrors.price_per_night && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.price_per_night}</p>
                      )}
                    </div>

                    {/* Disponible */}
                    <div className="flex items-center pt-6">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="available"
                          checked={formData.available || false}
                          onChange={handleFormChange}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm font-semibold text-gray-700 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Disponible
                        </span>
                      </label>
                    </div>

                    {/* Amenities */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Amenities (separar por comas)
                      </label>
                      <input
                        type="text"
                        name="amenities"
                        value={formData.amenities || ''}
                        onChange={handleFormChange}
                        className="input-field"
                        placeholder="WiFi, TV, Aire acondicionado, Cocina"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ejemplo: WiFi, TV, Aire acondicionado</p>
                    </div>

                    {/* Imágenes */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <ImageIcon className="w-4 h-4 inline mr-1" />
                        URLs de Imágenes (separar por comas)
                      </label>
                      <input
                        type="text"
                        name="images"
                        value={formData.images || ''}
                        onChange={handleFormChange}
                        className="input-field"
                        placeholder="https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ejemplo: https://ejemplo.com/imagen1.jpg, https://ejemplo.com/imagen2.jpg</p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                    <motion.button
                      type="button"
                      onClick={handleCloseModal}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-secondary px-6"
                      disabled={submitting}
                    >
                      Cancelar
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={submitting}
                      className="btn-primary px-6 flex items-center"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Guardar Cambios
                        </>
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

