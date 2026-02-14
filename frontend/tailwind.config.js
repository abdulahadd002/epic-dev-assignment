/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        purple: '#9333ea',
        blue: '#3b82f6',
        green: '#10b981',
        orange: '#f97316',
        cyan: '#06b6d4',
        amber: '#f59e0b',
        red: '#ef4444',
        indigo: '#6366f1'
      }
    },
  },
  plugins: [],
}
