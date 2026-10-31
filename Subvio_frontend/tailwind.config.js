/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        cloud: '#F8F7FC',
        ink: { DEFAULT: '#1E1B2E', muted: '#6E6A82' },
        line: '#ECEAF3',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(30, 27, 46, 0.04), 0 4px 16px -6px rgba(30, 27, 46, 0.08)',
        lift: '0 2px 4px rgba(30, 27, 46, 0.04), 0 18px 36px -14px rgba(30, 27, 46, 0.18)',
        pop: '0 24px 56px -16px rgba(30, 27, 46, 0.28)',
        glow: '0 10px 28px -8px rgba(124, 58, 237, 0.5)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, -8%, 0) scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        drift: 'drift 16s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shine: 'shine 6s linear infinite',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};
