import type { Config } from 'tailwindcss';

// Barkar brand tokens mirror the marketing site (purple/magenta on midnight).
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0118',
        bg2: '#11062A',
        card: '#1C1130',
        purple: { DEFAULT: '#7C3AED', light: '#A855F7', deep: '#5B21B6' },
        magenta: '#EC4899',
        muted: '#9090A8'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif']
      }
    }
  },
  plugins: []
};
export default config;
