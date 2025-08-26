/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors'); // Import the default colors

module.exports = {
  content: [
    "./src/**/*.{astro,html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-navy': '#0c2f5a',
        'fresh-sky': '#0ea5e9',
        'light-sky': '#e0f2fe',
        'light-gray': '#f8fafc',
        'accent-yellow': '#F59E0B',
        'red-error': '#ef4444',
        // Alias Tailwind's default gray palette
        'gray-warm': colors.gray,
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'fresh-sky-glow': '0 0 0 4px rgba(14, 165, 233, 0.2)',
      },
      backgroundImage: {
        'progress-gradient': "linear-gradient(90deg, #38bdf8, #0ea5e9)",
      },
      keyframes: {
        sweep: { 
          'from': { 'grid-template-rows': '0fr', opacity: 0 }, 
          'to': { 'grid-template-rows': '1fr', opacity: 1 },
        },
        fadeIn: { 
          'from': { opacity: 0, transform: 'translateY(20px)' }, 
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: { 
          'from': { bottom: '-100px', opacity: 0 }, 
          'to': { bottom: '20px', opacity: 1 },
        },
        lift: { 
          '0%, 100%': { transform: 'translateY(0px)' }, 
          '50%': { transform: 'translateY(-8px)' },
        },
        pulse: {
          '50%': { opacity: .5 },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-24px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
      },
      animation: {
        sweep: 'sweep 0.3s ease-in-out forwards',
        fadeIn: 'fadeIn 0.5s ease',
        slideUp: 'slideUp 0.5s ease-out',
        lift: 'lift 8s ease-in-out infinite',
        'pulse-once': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) 1',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        'float-fast': 'float-fast 3s ease-in-out infinite',
        'float-medium': 'float-medium 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
