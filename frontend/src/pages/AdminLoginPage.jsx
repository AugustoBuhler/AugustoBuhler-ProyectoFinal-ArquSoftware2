import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Lock, User } from 'lucide-react'
import { login, setAuthToken, setUser } from '../services/auth'

const AdminLoginPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await login(formData.username, formData.password)
      if (response.user.user_type !== 'admin') {
        setError('Solo los administradores pueden acceder a esta sección')
        return
      }
      setAuthToken(response.token)
      setUser(response.user)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border border-hairline bg-paper w-full max-w-md p-10"
        style={{ borderRadius: '4px' }}
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-hairline bg-[#efece6] mb-5"
          >
            <Lock className="w-7 h-7 text-primary-600" />
          </motion.div>
          <h1 className="font-display text-[28px] font-bold text-ink mb-1">Panel Administrativo</h1>
          <p className="text-ink-soft text-sm">Ingresá tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded text-sm"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-ink tracking-[0.08em] uppercase mb-2">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-ink tracking-[0.08em] uppercase mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="btn-primary w-full py-4 text-base disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-ink-soft hover:text-primary-600 transition-colors duration-150">
            ← Volver al inicio
          </a>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLoginPage
