import axios from 'axios'
import { getAuthToken } from './auth'

const APARTMENTS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8081/api/v1'
  : (import.meta.env.VITE_APARTMENTS_API_URL || 'http://localhost:8081/api/v1')

const BOOKINGS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8082/api/v1'
  : (import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:8082/api/v1')

const apartmentsAPI = axios.create({
  baseURL: APARTMENTS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const bookingsAPI = axios.create({
  baseURL: BOOKINGS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRÍTICO: Deshabilitar transformación automática de fechas
  // Asegurar que las fechas se mantengan como strings "YYYY-MM-DD"
  transformResponse: [
    (data) => {
      try {
        const parsed = JSON.parse(data)
        // Mantener fechas como strings, NO convertir a Date
        return parsed
      } catch (e) {
        return data
      }
    },
  ],
})

// Interceptor para agregar token a todas las peticiones
apartmentsAPI.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

bookingsAPI.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Apartamentos
export const getAllApartments = async () => {
  const response = await apartmentsAPI.get('/apartments?size=100')
  return response.data
}

export const createApartment = async (apartmentData) => {
  const response = await apartmentsAPI.post('/apartments', apartmentData)
  return response.data
}

export const updateApartment = async (id, apartmentData) => {
  const response = await apartmentsAPI.patch(`/apartments/${id}`, apartmentData)
  return response.data
}

export const deleteApartment = async (id) => {
  const response = await apartmentsAPI.delete(`/apartments/${id}`)
  return response.data
}

// Reservas
export const getAllBookings = async () => {
  // Obtener TODAS las reservas (públicas y con user_id) - para admin
  try {
    const response = await bookingsAPI.get('/bookings?size=1000')
    return response.data
  } catch (error) {
    console.error('Error fetching bookings:', error)
    // Si falla, retornar array vacío
    return { data: [], total: 0 }
  }
}

// Obtener reservas filtradas por estado (opcional)
export const getBookingsByStatus = async (status) => {
  try {
    const params = status ? { status, size: 1000 } : { size: 1000 }
    const response = await bookingsAPI.get('/bookings', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching bookings by status:', error)
    return { data: [], total: 0 }
  }
}

export const getBookingById = async (id) => {
  const response = await bookingsAPI.get(`/bookings/${id}`)
  return response.data
}

export const createBooking = async (bookingData) => {
  const response = await bookingsAPI.post('/bookings', bookingData)
  return response.data
}

export const updateBooking = async (id, bookingData) => {
  const response = await bookingsAPI.patch(`/bookings/${id}`, bookingData)
  return response.data
}

export const deleteBooking = async (id) => {
  const response = await bookingsAPI.delete(`/bookings/${id}`)
  return response.data
}

// Marcar una reserva como concluida (si su check_out ya pasó)
export const completeBooking = async (id) => {
  const response = await bookingsAPI.patch(`/bookings/${id}/complete`)
  return response.data
}

// Cancelar una reserva (admin)
export const cancelBooking = async (id) => {
  const response = await bookingsAPI.patch(`/bookings/${id}/cancel`)
  return response.data
}

// Marcar automáticamente todas las reservas vencidas como concluidas
export const markExpiredBookingsAsCompleted = async () => {
  const response = await bookingsAPI.post('/bookings/mark-expired-as-completed')
  return response.data
}

// Marcar reserva como PAGADO
export const markBookingAsPaid = async (id, dollarRate) => {
  const response = await bookingsAPI.patch(`/bookings/${id}/paid`, { dollar_rate: dollarRate })
  return response.data
}

// Tipo de cambio del dólar
export const getDollarRate = async () => {
  const response = await bookingsAPI.get('/config/dollar-rate')
  return response.data
}

export const setDollarRate = async (rate) => {
  const response = await bookingsAPI.put('/config/dollar-rate', { rate })
  return response.data
}

// Historial de tipos de cambio
export const getDollarRateHistory = async () => {
  const response = await bookingsAPI.get('/config/dollar-rate/history')
  return response.data
}

// Estadísticas financieras
export const getFinanceStats = async (period = 'monthly') => {
  const response = await bookingsAPI.get('/stats/finance', { params: { period } })
  return response.data
}

// Todos los pagos registrados en MySQL
export const getAllPayments = async () => {
  const response = await bookingsAPI.get('/stats/payments')
  return response.data
}

// Cotizaciones del dólar en tiempo real (proxy → dolarapi.com, cache 5 min en backend)
export const getMarketRates = async () => {
  const response = await bookingsAPI.get('/stats/market-rates')
  return response.data.data || []
}

