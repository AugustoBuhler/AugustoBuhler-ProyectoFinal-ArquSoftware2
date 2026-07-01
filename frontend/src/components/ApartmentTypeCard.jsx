import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="border border-hairline bg-paper overflow-hidden group"
      style={{ borderRadius: '4px' }}
    >
      <Link to={`/booking?type=${type.type}`}>
        <div className="relative h-56 overflow-hidden bg-[#efece6]">
          {image ? (
            <img
              src={image}
              alt={type.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-[#efece6]" />
          )}
          {type.available && (
            <div className="absolute top-3 right-3 bg-paper text-ink text-xs font-semibold px-3 py-1 rounded-full border border-hairline">
              {type.count} disponibles
            </div>
          )}
        </div>

        <div className="p-6">
          <h3 className="font-display text-[22px] font-bold text-ink mb-2">
            {type.name}
          </h3>
          <p className="text-ink-soft text-sm mb-4 line-clamp-2">
            {type.description}
          </p>

          <div className="flex items-center text-ink-soft text-sm mb-4">
            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Hasta {type.max_guests} personas</span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <div>
              <span className="font-display text-[26px] font-bold text-ink leading-none">
                ${type.min_price === type.max_price
                  ? type.min_price?.toLocaleString('es-AR')
                  : `${type.min_price?.toLocaleString('es-AR')} – ${type.max_price?.toLocaleString('es-AR')}`}
              </span>
              <span className="text-muted text-sm ml-1">/ noche</span>
            </div>
            <span className="text-primary-600 font-semibold text-[15px] font-display border-b border-transparent group-hover:border-primary-600 transition-colors duration-150">
              Reservar →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default ApartmentTypeCard
