/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // These custom animations support the 'animate-in' classes in your code
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        }
      },
      animation: {
        shake: 'shake 0.3s ease-in-out',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"), // Optional: adds support for 'animate-in'
  ],
}