/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        '120': '30rem', // 480px
        '80': '20rem',  // 320px
        '100': '25rem', // 400px
      }
    },
  },
  plugins: [],
};
