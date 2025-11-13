import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Users, Bed, Bath, DollarSign } from 'lucide-react'

const ApartmentCard = ({ apartment, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="card"
    >
      <Link to={`/apartment/${apartment.id}`}>
        <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
          {apartment.images && apartment.images.length > 0 ? (
            <img
              src={apartment.images[0]}
              alt={apartment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-4xl">
              🏠
            </div>
          )}
          {apartment.available && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Disponible
            </div>
          )}
        </div>
        
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-1">
            {apartment.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {apartment.description}
          </p>
          
          <div className="flex items-center text-gray-500 text-sm mb-4">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{apartment.city}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{apartment.max_guests}</span>
              </div>
              <div className="flex items-center">
                <Bed className="w-4 h-4 mr-1" />
                <span>{apartment.bedrooms}</span>
              </div>
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                <span>{apartment.bathrooms}</span>
              </div>
            </div>
          </div>
          
          {apartment.amenities && apartment.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {apartment.amenities.slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-baseline">
              <DollarSign className="w-5 h-5 text-primary-600" />
              <span className="text-2xl font-bold text-primary-600">
                {apartment.price_per_night}
              </span>
              <span className="text-gray-500 ml-1">/noche</span>
            </div>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-primary-600 font-semibold"
            >
              Ver detalles →
            </motion.span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default ApartmentCard

