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
    const response = await searchAPI.get('/search', { params })
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

