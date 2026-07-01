const Footer = () => {
  return (
    <footer className="border-t border-hairline mt-16 pt-16 pb-10">
      <div className="max-w-6xl mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-[9px] h-[9px] rounded-full bg-primary-600 flex-shrink-0" />
              <span className="font-display font-bold text-[15px] tracking-[0.04em] uppercase text-ink">
                Docta Suites
              </span>
            </div>
            <p className="text-[15px] text-ink-soft leading-relaxed max-w-[30ch]">
              Departamentos amoblados pensados para estadías cómodas y modernas, ya sea por trabajo o turismo.
            </p>
          </div>

          <div>
            <h4 className="font-display text-[13px] font-medium tracking-[0.16em] uppercase text-muted mb-4">
              Contacto
            </h4>
            <ul className="space-y-2.5 text-[15px] text-ink-soft">
              <li>
                <a href="tel:+5493516318393" className="hover:text-primary-600 transition-colors duration-150">
                  +54 9 351 631 8393
                </a>
              </li>
              <li>
                <a href="mailto:hola@doctasuites.com" className="hover:text-primary-600 transition-colors duration-150">
                  hola@doctasuites.com
                </a>
              </li>
              <li className="text-muted">Córdoba, Argentina</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-[13px] font-medium tracking-[0.16em] uppercase text-muted mb-4">
              Redes
            </h4>
            <ul className="space-y-2.5 text-[15px] text-ink-soft">
              <li>
                <a
                  href="https://www.instagram.com/doctasuitesap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 transition-colors duration-150"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=100090876227277"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 transition-colors duration-150"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://api.whatsapp.com/send/?phone=5493516318393"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 transition-colors duration-150"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-hairline pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[13px] text-muted">
          <span>© {new Date().getFullYear()} Docta Suites. Todos los derechos reservados.</span>
          <span>Hecho en Córdoba</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
