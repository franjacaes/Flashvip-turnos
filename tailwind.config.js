/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdbff',
          300: '#8ec5ff',
          400: '#59a4ff',
          500: '#3381ff',
          600: '#1a5ff5',
          700: '#1349d6',
          800: '#163dac',
          900: '#183888',
          950: '#132452',
        }
      }
    },
  },
  plugins: [],
}
