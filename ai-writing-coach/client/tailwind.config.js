/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand palette — locked from HTML prototype
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#5B5BF7",
          600: "#4c4ce0",
          700: "#3d3dbd",
        },
        // Semantic colors
        correct: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "brand-soft": "0 10px 25px -5px rgba(91, 91, 247, 0.15)",
      },
    },
  },
  plugins: [],
};
