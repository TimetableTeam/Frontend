/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tanseek: {
          navy: '#142B43',
          teal: '#15A6A0',
          alert: '#B76A25',
          ink: '#20364A',
          muted: '#607383',
          canvas: '#F2F6F7',
          line: '#D7E0E4',
          surface: '#FFFFFF',
          tealSoft: '#DFF4F2',
          alertSoft: '#FFF1E3',
          navySoft: '#E9EFF4'
        }
      },
      fontFamily: {
        sans: ['"DejaVu Sans"', 'Arial', 'sans-serif'],
        arabic: ['Alexandria', '"DejaVu Sans"', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        brand: '10px',
        'brand-sm': '7px',
      },
      boxShadow: {
        soft: '0 10px 32px rgba(20, 43, 67, 0.08)',
      }
    },
  },
  plugins: [],
}
