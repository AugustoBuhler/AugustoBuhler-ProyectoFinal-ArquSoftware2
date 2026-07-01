import axios from 'axios'

// Usar localhost para el navegador (no puede resolver nombres de Docker)
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8083' 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083')

const APARTMENTS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8081/api/v1'
  : (import.meta.env.VITE_APARTMENTS_API_URL || 'http://localhost:8081/api/v1')

const BOOKINGS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8082/api/v1'
  : (import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:8082/api/v1')

const searchAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  // Por defecto axios NO transforma strings a Date, pero asegurémonos
  transformResponse: [
    (data) => {
      try {
        const parsed = JSON.parse(data)
        // Si tiene fechas en formato string "YYYY-MM-DD", mantenerlas como strings
        // NO convertir a Date automáticamente
        return parsed
      } catch (e) {
        return data
      }
    },
  ],
})

export const searchApartments = async (params = {}) => {
  try {
    const response = await searchAPI.get('/search', { params: { ...params, _t: Date.now() } })
    return response.data
  } catch (error) {
    console.error('Error searching apartments:', error)
    throw error
  }
}

export const getApartmentById = async (id) => {
  try {
    const response = await apartmentsAPI.get(`/apartments/${id}`)
    return response.data
  } catch (error) {
    console.error('Error fetching apartment:', error)
    throw error
  }
}

// Retorna true si hay disponibilidad, false si no hay, null si hubo error
export const checkTypeAvailability = async (type, checkIn, checkOut) => {
  try {
    await apartmentsAPI.get('/apartments/available-by-type', {
      params: { type, check_in: checkIn, check_out: checkOut },
    })
    return true
  } catch (error) {
    if (error.response?.status === 404) return false
    return null // error de red → no mostrar nada
  }
}

export const createBooking = async (bookingData) => {
  try {
    const response = await bookingsAPI.post('/bookings', bookingData)
    return response.data
  } catch (error) {
    console.error('Error creating booking:', error)
    throw error
  }
}

export const getBookingById = async (id) => {
  try {
    const response = await bookingsAPI.get(`/bookings/${id}`)
    return response.data
  } catch (error) {
    console.error('Error fetching booking:', error)
    throw error
  }
}

export const getUserBookings = async (userId) => {
  try {
    const response = await bookingsAPI.get(`/bookings/user/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    throw error
  }
}

export const createCheckout = async (bookingId) => {
  try {
    const response = await bookingsAPI.post(`/bookings/${bookingId}/checkout`)
    return response.data
  } catch (error) {
    console.error('Error creating checkout:', error)
    throw error
  }
}

export const triggerPaymentWebhook = async (paymentId) => {
  await bookingsAPI.post('/payments/confirm', { payment_id: String(paymentId) })
}

export const verifyPayment = async (bookingId) => {
  const response = await bookingsAPI.post(`/bookings/${bookingId}/verify-payment`)
  return response.data
}

export const cancelBookingAsGuest = async (bookingId, reason = '') => {
  const response = await bookingsAPI.post(`/bookings/${bookingId}/cancel-guest`, { reason })
  return response.data
}

export const getBookingsByContact = async (dni, email) => {
  const response = await bookingsAPI.get('/bookings/by-contact', { params: { dni, email } })
  return response.data
}

