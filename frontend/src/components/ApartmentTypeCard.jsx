import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, DollarSign } from 'lucide-react'

const TYPE_IMAGES = {
  quadruple: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&q=80',
  triple: 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=600&q=80',
  double_matrimonial: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
  double_twin: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80',
}

const ApartmentTypeCard = ({ type, index }) => {
  const image = TYPE_IMAGES[type.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="card border border-gray-100 overflow-hidden"
    >
      <Link to={`/booking?type=${type.type}`}>
        <div className="relative h-56 overflow-hidden bg-gray-200">
          {image ? (
            <img
              src={image}
              alt={type.name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {type.available && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow">
              {type.count} disponibles
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {type.name}
          </h3>
          <p className="text-gray-600 mb-4 line-clamp-2">
            {type.description}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-gray-500">
              <Users className="w-5 h-5 mr-2" />
              <span>Hasta {type.max_guests} personas</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-baseline">
              <DollarSign className="w-5 h-5 text-primary-600" />
              <span className="text-2xl font-bold text-primary-600">
                {type.min_price === type.max_price 
                  ? type.min_price 
                  : `${type.min_price} - ${type.max_price}`}
              </span>
              <span className="text-gray-500 ml-1">/noche</span>
            </div>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-primary-600 font-semibold"
            >
              Reservar →
            </motion.span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default ApartmentTypeCard

