import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, DollarSign } from 'lucide-react'

const ApartmentTypeCard = ({ type, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="card"
    >
      <Link to={`/booking?type=${type.type}`}>
        <div className="relative h-64 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center text-white text-6xl">
            {type.type === 'quadruple' && '🏠'}
            {type.type === 'triple' && '🏡'}
            {type.type === 'double_matrimonial' && '💑'}
            {type.type === 'double_twin' && '👥'}
          </div>
          {type.available && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
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

