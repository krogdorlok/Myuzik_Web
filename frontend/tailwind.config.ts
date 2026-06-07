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
        background: "#0a0a0a",
        surface: "#111111",
        border: "#1e1e1e",
        text: "#f0ede6",
        muted: "#666666",
        accent: "#c8ff57",
        "accent-dim": "#6a8a30",
        error: "#ff5757",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        logo: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
