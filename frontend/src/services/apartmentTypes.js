import axios from 'axios'

const APARTMENTS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8081/api/v1'
  : (import.meta.env.VITE_APARTMENTS_API_URL || 'http://localhost:8081/api/v1')

const apartmentsAPI = axios.create({
  baseURL: APARTMENTS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getApartmentTypes = async () => {
  try {
    const response = await apartmentsAPI.get('/apartment-types')
    return response.data.data || []
  } catch (error) {
    console.error('Error fetching apartment types:', error)
    throw error
  }
}

export const getAvailableApartmentByType = async (type, checkIn, checkOut) => {
  try {
    const response = await apartmentsAPI.get('/apartments/available-by-type', {
      params: {
        type,
        check_in: checkIn,
        check_out: checkOut,
      },
    })
    return response.data
  } catch (error) {
    console.error('Error fetching available apartment:', error)
    throw error
  }
}

