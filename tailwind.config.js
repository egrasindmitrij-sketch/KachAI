/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "gym-bg": "#0B0B0B",
        "gym-card": "#151515",
        "gym-red": "#D00000",
        "gym-muted": "#8C8C8C"
      }
    }
  },
  plugins: []
};
