/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF6EE',
          100: '#FFEBD4',
          200: '#FFD4A8',
          300: '#FFB76E',
          400: '#FF9A38',
          500: '#F7931E',
          600: '#E07B10',
          700: '#D4780A',
          800: '#7A3500',
          900: '#5C2800',
          950: '#3D1A00',
        }
      }
    },
  },
  plugins: [],
}
