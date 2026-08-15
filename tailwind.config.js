/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./404.html",
    "./legal-privacy.html",
    "./legal-terms.html",
    "./release-notes.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          orange: "#f97316", // Primary
          navy: "#0f172a", // Text Main
          slate: "#64748b", // Text Secondary
          blue: "#3b82f6", // Accents
          teal: "#14b8a6", // Success
          light: "#f1f5f9", // App Background
          card: "#ffffff", // App Card
          border: "#e2e8f0", // App Border
        },
      },
      backgroundImage: {
        "dot-pattern": "radial-gradient(#cbd5e1 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
