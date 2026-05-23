/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#000000",
          navy: "#0a192f",
          "navy-light": "#172a45",
          orange: "#ff8c00",
          gold: "#d4af37",
        }
      },
    },
  },
  plugins: [],
};
