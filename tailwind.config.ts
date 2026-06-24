import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
} satisfies Config;
