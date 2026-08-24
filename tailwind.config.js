/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#030712',
          surface: '#0a1128',
          cyan: '#00f0ff',
          blue: '#3b82f6',
          purple: '#a855f7',
          pink: '#ec4899',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
