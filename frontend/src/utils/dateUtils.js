/**
 * Utilidades para parsear y formatear fechas correctamente
 * 
 * El backend ahora devuelve las fechas directamente como strings "YYYY-MM-DD"
 * (sin hora ni zona horaria), así que solo necesitamos formatear a dd/MM/yyyy
 */

/**
 * Formatea una fecha del backend a formato dd/MM/yyyy
 * El backend ahora devuelve fechas como "YYYY-MM-DD" (sin hora ni zona horaria)
 * @param {string} dateString - Fecha en formato "YYYY-MM-DD" (ej: "2025-11-29")
 * @returns {string} - Fecha formateada como "dd/MM/yyyy" o "N/A" si es inválida
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A'
  
  // ESTRATEGIA: Extraer componentes de fecha directamente sin usar Date
  // para evitar completamente problemas de zona horaria
  
  let dateStr = null
  
  // Caso 1: Es un string directo "YYYY-MM-DD"
  if (typeof dateValue === 'string') {
    dateStr = dateValue
  }
  // Caso 2: Es un objeto Date (puede pasar si axios lo convierte)
  else if (dateValue instanceof Date) {
    // Extraer la fecha directamente del ISO string del Date usando UTC
    // Ejemplo: "2026-01-14T00:00:00.000Z" → "2026-01-14"
    const isoString = dateValue.toISOString()
    dateStr = isoString.split('T')[0]
  }
  // Caso 3: Es otro tipo, intentar convertir a string
  else {
    dateStr = String(dateValue)
  }
  
  // Extraer solo la parte de la fecha (YYYY-MM-DD) del string
  // Si viene en formato ISO completo (por compatibilidad), extraer solo la fecha
  let datePart = dateStr
  if (dateStr && dateStr.includes('T')) {
    datePart = dateStr.split('T')[0] // "2025-11-29T00:00:00Z" → "2025-11-29"
  }
  
  // Validar formato YYYY-MM-DD
  if (!datePart || !datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Si no coincide, intentar parsear como Date y usar UTC
    if (dateValue instanceof Date) {
      const year = dateValue.getUTCFullYear()
      const month = dateValue.getUTCMonth() + 1
      const day = dateValue.getUTCDate()
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
    return 'N/A'
  }
  
  // Parsear año, mes y día directamente del string
  const parts = datePart.split('-')
  if (parts.length !== 3) {
    return 'N/A'
  }
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  
  // Validar que sean números válidos
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return 'N/A'
  }
  
  // Validar rangos
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return 'N/A'
  }
  
  // Formatear directamente SIN usar objetos Date
  // Esto evita completamente cualquier problema de zona horaria
  const dayStr = String(day).padStart(2, '0')
  const monthStr = String(month).padStart(2, '0')
  
  return `${dayStr}/${monthStr}/${year}`
}

/**
 * Parsea una fecha ISO del backend a un objeto Date local
 * (Mantiene compatibilidad con código existente que usa Date)
 * @param {string} dateString - Fecha en formato ISO (ej: "2025-11-29T00:00:00Z") o formato fecha (ej: "2025-11-29")
 * @returns {Date|null} - Objeto Date en hora local o null si la fecha es inválida
 */
export const parseDate = (dateString) => {
  if (!dateString) return null
  
  // Extraer solo la parte de la fecha (YYYY-MM-DD) del string ISO
  let datePart
  if (dateString.includes('T')) {
    datePart = dateString.split('T')[0] // "2025-11-29T00:00:00Z" → "2025-11-29"
  } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    datePart = dateString // Ya viene como "2025-11-29"
  } else {
    return null
  }
  
  // Parsear año, mes y día
  const [year, month, day] = datePart.split('-').map(Number)
  
  // Validar que sean números válidos
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null
  }
  
  // Crear fecha en hora local (no UTC) para evitar que se muestre un día antes
  // Esto asegura que la fecha se mantenga exactamente como viene de la BD
  return new Date(year, month - 1, day)
}
