/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["SFMono-Regular", "Cascadia Code", "Liberation Mono", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#f4f1ea",
        ink: "#171717",
        accent: "#1d55ff",
      },
    },
  },
  plugins: [],
};
