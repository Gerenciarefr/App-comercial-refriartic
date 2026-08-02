/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefcff',
          100: '#d6f6ff',
          400: '#22b8e6',
          500: '#0ea5d9',
          600: '#0b84b0',
          700: '#0a6a8d',
          900: '#0a3a4d',
        },
      },
    },
  },
  plugins: [],
}
