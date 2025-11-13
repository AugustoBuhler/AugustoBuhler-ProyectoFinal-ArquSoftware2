import axios from 'axios'

const USERS_API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8080/api/v1'
  : (import.meta.env.VITE_USERS_API_URL || 'http://localhost:8080/api/v1')

const usersAPI = axios.create({
  baseURL: USERS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const login = async (username, password) => {
  try {
    const response = await usersAPI.post('/users/login', {
      username,
      password,
    })
    return response.data
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

export const getAuthToken = () => {
  return localStorage.getItem('auth_token')
}

export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token)
}

export const removeAuthToken = () => {
  localStorage.removeItem('auth_token')
}

export const getUser = () => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch (e) {
      return null
    }
  }
  return null
}

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user))
}

export const removeUser = () => {
  localStorage.removeItem('user')
}

export const isAdmin = () => {
  const user = getUser()
  return user && user.user_type === 'admin'
}

export const logout = () => {
  removeAuthToken()
  removeUser()
}

