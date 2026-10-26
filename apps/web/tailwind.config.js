/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: '#3E2723',
        cocoa: '#4E342E',
        'warm-brown': '#6D4C41',
        taupe: '#8D6E63',
        mocha: '#A1887F',
        greige: '#BCAAA4',
        beige: '#D7CCC8',
        'off-white': '#F7F2EF',
        ivory: '#FFFFFF',
        brand: {
          50: '#FDFBF7',
          100: '#F7F2EF',
          200: '#EFEBE9',
          300: '#D7CCC8',
          400: '#BCAAA4',
          500: '#A1887F',
          600: '#8D6E63',
          700: '#6D4C41',
          800: '#4E342E',
          900: '#3E2723',
          950: '#271815',
        },
      },
    },
  },
  plugins: [],
};
