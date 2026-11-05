/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Proxima Nova"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        blue: {
          900: "#005F8E",
          800: "#0087C1",
          600: '#0087C1',
          500: "#099bce"
        },
        purple: {
          500: '#8E26A2',
        },
        green: {
          100: "#1DEDC5",
          500: "#1bbfa0",
          600: "#25d6b4"
        },
        yellow: {
          500: "#EBBE5F"
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
