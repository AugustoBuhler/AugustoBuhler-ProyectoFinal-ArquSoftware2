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
  // Obtener todas las reservas (usando el endpoint de usuario con admin user_id)
  // En el futuro, se puede crear un endpoint GET /bookings sin user_id para admin
  try {
    const response = await bookingsAPI.get('/bookings/user/1')
    return response.data
  } catch (error) {
    console.error('Error fetching bookings:', error)
    // Si falla, intentar obtener de forma diferente o retornar array vacío
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

