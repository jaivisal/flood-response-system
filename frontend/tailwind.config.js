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
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
            950: '#172554',
          },
          emergency: {
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#f97316',
            critical: '#dc2626',
          },
          status: {
            available: '#22c55e',
            busy: '#f59e0b',
            offline: '#6b7280',
            maintenance: '#dc2626',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'slide-down': 'slideDown 0.3s ease-out',
          'scale-in': 'scaleIn 0.2s ease-out',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'bounce-slow': 'bounce 2s infinite',
          'blob': 'blob 7s infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          slideDown: {
            '0%': { transform: 'translateY(-10px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          scaleIn: {
            '0%': { transform: 'scale(0.95)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' },
          },
          blob: {
            '0%': {
              transform: 'translate(0px, 0px) scale(1)',
            },
            '33%': {
              transform: 'translate(30px, -50px) scale(1.1)',
            },
            '66%': {
              transform: 'translate(-20px, 20px) scale(0.9)',
            },
            '100%': {
              transform: 'translate(0px, 0px) scale(1)',
            },
          },
        },
        backdropBlur: {
          xs: '2px',
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '128': '32rem',
        },
        minHeight: {
          '0': '0',
          '1/4': '25%',
          '1/2': '50%',
          '3/4': '75%',
          'full': '100%',
          'screen': '100vh',
          'screen-75': '75vh',
          'screen-50': '50vh',
        },
        zIndex: {
          '60': '60',
          '70': '70',
          '80': '80',
          '90': '90',
          '100': '100',
        },
        boxShadow: {
          'glow': '0 0 20px rgba(59, 130, 246, 0.15)',
          'glow-sm': '0 0 10px rgba(59, 130, 246, 0.1)',
          'emergency': '0 0 30px rgba(220, 38, 38, 0.2)',
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
          'emergency-gradient': 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
          'success-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          'warning-gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        },
        screens: {
          'xs': '475px',
          '3xl': '1680px',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
      // Custom plugin for animation delays
      function({ addUtilities }) {
        const newUtilities = {
          '.animation-delay-2000': {
            'animation-delay': '2s',
          },
          '.animation-delay-4000': {
            'animation-delay': '4s',
          },
          '.text-shadow': {
            'text-shadow': '2px 2px 4px rgba(0, 0, 0, 0.1)',
          },
          '.text-shadow-lg': {
            'text-shadow': '4px 4px 8px rgba(0, 0, 0, 0.2)',
          },
          '.border-gradient': {
            'border': '1px solid',
            'border-image': 'linear-gradient(45deg, #3b82f6, #8b5cf6) 1',
          },
        }
        addUtilities(newUtilities)
      }
    ],
  }