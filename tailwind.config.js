/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';
import typography from '@tailwindcss/typography';

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{astro,html,js,ts,jsx,tsx}'
  ],
  safelist: [
    // ensure transition utilities not purged if only toggled at runtime
    'transition-colors','duration-300','dark'
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
        gray: colors.gray,
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'focus-sky': '0 0 0 4px rgba(14,165,233,0.35)',
        'fresh-sky-glow': '0 0 0 4px rgba(14, 165, 233, 0.2)',
      },
      backgroundImage: {
        'progress-gradient': 'linear-gradient(90deg,#38bdf8,#0ea5e9)',
      },
  // Removed unused animation & keyframe extensions; animations now centralized in input.css
    },
  },
  plugins: [typography()],
};
