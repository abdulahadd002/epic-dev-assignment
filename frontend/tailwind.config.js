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
        base: '#050505',
        surface: {
          DEFAULT: '#0c0c0c',
          raised: '#141414',
          overlay: '#1a1a1a',
        },
        card: {
          bg: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.06)',
        },
        accent: {
          cyan: '#70E6ED',
          lime: '#CAF291',
          pink: '#FFB3DB',
        },
        muted: 'rgba(255, 255, 255, 0.5)',
        subtle: 'rgba(255, 255, 255, 0.06)',
        success: { DEFAULT: '#34D399', muted: 'rgba(52, 211, 153, 0.15)' },
        warning: { DEFAULT: '#FBBF24', muted: 'rgba(251, 191, 36, 0.15)' },
        danger: { DEFAULT: '#F87171', muted: 'rgba(248, 113, 113, 0.15)' },
        info: { DEFAULT: '#70E6ED', muted: 'rgba(112, 230, 237, 0.15)' },
        purple: '#A78BFA',
        blue: '#60A5FA',
        green: '#34D399',
        orange: '#FB923C',
        cyan: '#70E6ED',
        amber: '#FBBF24',
        red: '#F87171',
        indigo: '#818CF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '24px',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
