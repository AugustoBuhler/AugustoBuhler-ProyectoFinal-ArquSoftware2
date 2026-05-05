import { motion } from 'framer-motion'
import { Mail, Phone, Instagram, Facebook, MessageCircle } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gradient-to-r from-amber-50 via-white to-sky-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Apartamentos Temporales</h3>
          <p className="text-gray-600">
            Departamentos amoblados pensados para estadías cómodas y modernas, ya sea por trabajo
            o turismo.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Contacto</h3>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-primary-600" />
              <span>+54 9 351 000 0000</span>
            </li>
            <li className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-primary-600" />
              <span>contacto@apartamentostemporales.com</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Redes</h3>
          <div className="flex items-center space-x-4">
            <motion.a
              whileHover={{ scale: 1.05 }}
              href="https://www.instagram.com/doctasuitesap?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-700 hover:text-pink-600"
            >
              <Instagram className="w-5 h-5" />
              <span>Instagram</span>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              href="https://www.facebook.com/profile.php?id=100090876227277&locale=es_LA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
            >
              <Facebook className="w-5 h-5" />
              <span>Facebook</span>
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              href="https://api.whatsapp.com/send/?phone=5493516318393&text="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-gray-700 hover:text-green-600"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </motion.a>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <span>
          © {new Date().getFullYear()} Apartamentos Temporales. Todos los derechos reservados.
        </span>
      </div>
    </footer>
  )
}

export default Footer
