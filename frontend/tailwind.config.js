/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#809eff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4451b8',
          800: '#353d94',
          900: '#2b3176',
        },
        secondary: {
          50: '#f9f5ff',
          100: '#f3ebff',
          200: '#e8d6ff',
          300: '#d6b3ff',
          400: '#bd80ff',
          500: '#764ba2',
          600: '#653a8b',
          700: '#542c74',
          800: '#43215d',
          900: '#34194a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
