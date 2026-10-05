/** @type {import('tailwindcss').Config} */
// Palette and type match the deck (CLAUDE.md section 4).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: '#5C1049', deep: '#4A0D3B' },
        magenta: '#9F2089',
        pink: '#F43397',
        orange: { DEFAULT: '#FE9C01', soft: '#FFE3B8' },
        cream: '#FFF4E5',
        blush: '#FCE4F1',
        ink: '#2B1026',
        grey: '#7A4E70',
        line: '#F0C9E2',
        good: '#1E9E5A',
        warn: '#E8A317',
        bad: '#D64545',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Cardo', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
