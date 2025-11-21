import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fa',
          100: '#e5e8f3',
          200: '#cfd5ea',
          300: '#adb7dd',
          400: '#7d8cc9',
          500: '#5f6eb4',
          600: '#4a579a',
          700: '#3d467c',
          800: '#333960',
          900: '#2c314f',
          950: '#1a1d30'
        }
      }
    }
  },
  plugins: []
} satisfies Config;

