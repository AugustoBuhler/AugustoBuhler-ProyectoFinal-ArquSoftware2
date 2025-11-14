# 🔌 Guía Rápida: Conexión a Bases de Datos - TablePlus

## 📊 Datos de Conexión

### 🗄️ MySQL (Users-API)

```
Tipo: MySQL
Host: localhost
Puerto: 3306
Usuario: root
Contraseña: root
Base de Datos: users_db
```

**Connection String:**
```
mysql://root:root@localhost:3306/users_db
```

**Tabla:**
- `users` - Usuarios del sistema

---

### 🍃 MongoDB (Apartments-API y Bookings-API)

```
Tipo: MongoDB
Host: localhost
Puerto: 27017
Usuario: root
Contraseña: root
Authentication Database: admin
```

**Connection String:**
```
mongodb://root:root@localhost:27017/?authSource=admin
```

**Bases de Datos:**
1. **`apartments_db`**
   - Colección: `apartments`
   - Información de apartamentos

2. **`bookings_db`**
   - Colección: `bookings`
   - Información de reservas

---

### 🐰 RabbitMQ Management UI

```
URL: http://localhost:15672
Usuario: admin
Contraseña: admin
```

**Acceso:** Navegador web (no TablePlus)

---

### 🔍 Solr Admin UI

```
URL: http://localhost:8983/solr
Usuario: (ninguno)
Contraseña: (ninguna)
```

**Acceso:** Navegador web (no TablePlus)

**Colección:** `apartments`

---

### 💾 Memcached

```
Host: localhost
Puerto: 11211
```

**Nota:** TablePlus no soporta Memcached directamente.

---

## ✅ Cómo Conectar en TablePlus

### MySQL
1. Nuevo → MySQL
2. Host: `localhost`, Puerto: `3306`
3. Usuario: `root`, Password: `root`
4. Database: `users_db`
5. Connect

### MongoDB
1. Nuevo → MongoDB
2. Host: `localhost`, Puerto: `27017`
3. Usuario: `root`, Password: `root`
4. Auth Database: `admin`
5. Connect
6. Seleccionar base de datos (`apartments_db` o `bookings_db`)

---

**✅ Con estos datos puedes conectarte a todas las bases de datos desde TablePlus.**

