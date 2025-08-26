/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgLight: "#F6F8FB",
        bgDark:  "#0C1117",
        textLight:"#0B1220",
        textDark: "#E6EDF3",
        primary: "#10B981",
        primaryDark: "#059669",
        surfaceLight: "#FFFFFF",
        surfaceDark:  "#151B23",
        boardLight:  "#EAF0D9",
        boardDark:   "#77A861",
        boardLightD: "#C5D8B2",
        boardDarkD:  "#598E57",
        hiLight: "#6EE7B7",
        hiDark:  "#34D399",
      },
      boxShadow: {
        card: "0 12px 28px rgba(0,0,0,0.18)",
        soft: "0 8px 20px rgba(0,0,0,0.12)",
      },
      borderRadius: { xl2: "20px" },
      maxWidth: { board: "560px" },
    },
  },
  plugins: [],
};
