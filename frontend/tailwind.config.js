/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b1220',
        card: 'rgba(15, 23, 42, 0.74)',
        border: '#2f4468',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
