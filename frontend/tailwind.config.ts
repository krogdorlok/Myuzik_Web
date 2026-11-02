import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        border: "#1e1e1e",
        text: "#f0ede6",
        muted: "#8a8a8a",
        accent: "#c8ff57",
        "accent-dim": "#6a8a30",
        error: "#ff5757",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      borderRadius: { sm: "4px", DEFAULT: "8px", md: "8px", lg: "12px", logo: "6px" },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "bar-in": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "page-in": "page-in 200ms ease-out both",
        "bar-in": "bar-in 500ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
