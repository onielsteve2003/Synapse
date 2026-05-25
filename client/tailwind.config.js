/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        body: ["Manrope", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        panel: "0 20px 45px rgba(8, 15, 29, 0.45)",
      },
      colors: {
        brand: {
          50: "#f0fdfa",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          950: "#042f2e",
        },
      },
    },
  },
  plugins: [],
};
