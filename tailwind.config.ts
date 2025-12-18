import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          coral: "#FF7F50", // Primary
          softWhite: "#FAF9F6", // Background
          sage: "#9CAF88", // Secondary/Accent?
          text: "#2D3748", // Dark text
        },
      },
    },
  },
  plugins: [],
};
export default config;
