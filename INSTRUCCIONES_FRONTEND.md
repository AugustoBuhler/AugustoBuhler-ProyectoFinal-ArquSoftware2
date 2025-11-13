# 🎨 Instrucciones para Usar el Frontend

## ✅ Frontend Completado

El Frontend React está completamente implementado con:
- ✨ Diseño limpio y moderno
- 🎬 Animaciones fluidas con Framer Motion
- 📱 Diseño responsive
- 🔍 Búsqueda avanzada
- 📝 Formulario de reserva completo
- ✅ Confirmación visual

## 🚀 Cómo Acceder

1. **Asegúrate de que todos los servicios estén corriendo:**
   ```bash
   docker-compose ps
   ```

2. **Abre tu navegador en:**
   ```
   http://localhost:3000
   ```

## 🎯 Flujo de Usuario

### 1. Búsqueda de Apartamentos
- En la página principal verás un formulario de búsqueda
- Puedes filtrar por:
  - 🔍 Texto libre (nombre)
  - 📍 Ciudad
  - 👥 Capacidad mínima
  - 💰 Rango de precios
  - 📅 Fechas (check-in, check-out)
- Haz clic en "Buscar Apartamentos"
- Explora los resultados en el grid

### 2. Ver Detalle
- Haz clic en cualquier apartamento
- Verás:
  - Imagen del apartamento
  - Descripción completa
  - Capacidad, habitaciones, baños
  - Comodidades
  - Precio por noche
- Haz clic en "Reservar Ahora"

### 3. Completar Reserva
- Completa el formulario:
  - **Fechas:** Selecciona check-in y check-out
  - **Huéspedes:** Número de personas
  - **Datos Personales:**
    - Nombre
    - Apellido
    - DNI
    - Teléfono
    - Email
  - **Método de Pago:** Transferencia o Efectivo
- En el panel lateral verás:
  - Resumen de la reserva
  - Cálculo automático del total
- Haz clic en "Confirmar Reserva"

### 4. Confirmación
- Verás una página de confirmación con:
  - ✅ Checkmark animado
  - Fechas de estancia
  - Número de huéspedes
  - Total pagado
  - Datos del huésped
  - Número de reserva
- Guarda el número de reserva
- Puedes volver a buscar más apartamentos

## 🎨 Características de Diseño

### Animaciones
- ✨ Entrada suave de componentes
- 🎯 Hover effects en tarjetas
- 🔄 Transiciones entre páginas
- ⏳ Loading spinners animados

### Colores
- Azul primario (#0ea5e9)
- Gradientes suaves
- Sombras elegantes
- Estados visuales claros

### Responsive
- 📱 Mobile first
- 💻 Tablet optimizado
- 🖥️ Desktop completo

## 🔧 Solución de Problemas

### No se cargan los apartamentos
1. Verifica que Search-API esté corriendo:
   ```bash
   docker logs search-api
   ```

2. Verifica que los apartamentos estén indexados:
   ```bash
   curl http://localhost:8083/api/v1/search?size=1
   ```

### Error al crear reserva
1. Verifica que Bookings-API esté corriendo:
   ```bash
   docker logs bookings-api
   ```

2. Verifica que el apartamento esté disponible para las fechas seleccionadas

### CORS Error
- Ya está configurado en todas las APIs
- Si persiste, verifica que las URLs sean correctas

## 📝 Notas

- El frontend usa `localhost` para las APIs cuando se accede desde el navegador
- Las animaciones mejoran la experiencia de usuario
- El diseño es completamente responsive
- Todos los formularios tienen validación en tiempo real

---

**🎉 ¡Disfruta del Frontend! Accede a http://localhost:3000**

