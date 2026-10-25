/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#0B0E14",
        cardbg: "#151A23",
        bordercol: "#232936",
        deltaAccent: "#00E676",
        dangerRed: "#FF334B",
        warningAmber: "#FFB020",
      }
    },
  },
  plugins: [],
}

