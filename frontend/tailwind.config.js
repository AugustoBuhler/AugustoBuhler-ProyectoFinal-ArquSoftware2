/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fdf5f0',
          100: '#fce8da',
          200: '#f8ccb0',
          300: '#f2a882',
          400: '#e97a52',
          500: '#cc6238',
          600: '#b0532e',
          700: '#934325',
          800: '#7a381e',
          900: '#662f1a',
        },
        paper:   '#f7f5f2',
        ink:     '#2b2b28',
        'ink-soft': '#55524b',
        muted:   '#8a857c',
        hairline: '#ddd8cf',
      },
      fontFamily: {
        sans:    ["'Instrument Sans'", 'sans-serif'],
        display: ["'Space Grotesk'",   'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

