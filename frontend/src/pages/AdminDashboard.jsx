import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Calendar, Users, Settings, LogOut, Plus, Edit, Trash2, Search } from 'lucide-react'
import { logout } from '../services/auth'
import { getAllApartments, createApartment, updateApartment, deleteApartment } from '../services/adminApi'
import { getAllBookings, updateBooking, deleteBooking } from '../services/adminApi'
import { format } from 'date-fns'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('apartments')
  const [apartments, setApartments] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingApartment, setEditingApartment] = useState(null)
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
                          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
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
                          <div className="flex space-x-2">
                            <button className="flex-1 btn-secondary text-sm py-2">
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
                          {format(new Date(booking.check_in), 'dd/MM/yyyy')} - {format(new Date(booking.check_out), 'dd/MM/yyyy')}
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
    </div>
  )
}

export default AdminDashboard

