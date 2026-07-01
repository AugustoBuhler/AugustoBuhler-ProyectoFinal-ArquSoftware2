import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Users, Bed, Bath } from 'lucide-react'

const ApartmentCard = ({ apartment, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="border border-hairline bg-paper overflow-hidden group"
      style={{ borderRadius: '4px' }}
    >
      <Link to={`/apartment/${apartment.id}`}>
        <div className="relative h-48 overflow-hidden bg-[#efece6]">
          {apartment.images && apartment.images.length > 0 ? (
            <img
              src={apartment.images[0]}
              alt={apartment.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-5xl">
              ⬜
            </div>
          )}
          {apartment.available && (
            <div className="absolute top-3 right-3 bg-paper text-ink text-xs font-semibold px-3 py-1 rounded-full border border-hairline">
              Disponible
            </div>
          )}
        </div>

        <div className="p-6">
          <h3 className="font-display text-[19px] font-bold text-ink mb-1 line-clamp-1">
            {apartment.name}
          </h3>
          <p className="text-ink-soft text-sm mb-4 line-clamp-2">
            {apartment.description}
          </p>

          <div className="flex items-center text-muted text-sm mb-4">
            <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span>{apartment.city}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-ink-soft mb-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{apartment.max_guests}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              <span>{apartment.bedrooms}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              <span>{apartment.bathrooms}</span>
            </div>
          </div>

          {apartment.amenities && apartment.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {apartment.amenities.slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-[#efece6] text-ink-soft px-2.5 py-1 text-xs rounded-full border border-hairline"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <div>
              <span className="font-display text-[24px] font-bold text-ink leading-none">
                ${apartment.price_per_night?.toLocaleString('es-AR')}
              </span>
              <span className="text-muted text-sm ml-1">/ noche</span>
            </div>
            <span className="text-primary-600 font-semibold text-[15px] font-display transition-colors group-hover:border-b group-hover:border-primary-600">
              Ver detalles →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default ApartmentCard
