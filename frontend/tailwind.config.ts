import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f1720",
        sand: "#f4ecdf",
        brass: "#ad7d32",
        ember: "#e55d2d",
        sage: "#8ea68f",
        plum: "#5f3f58",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(15, 23, 32, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
