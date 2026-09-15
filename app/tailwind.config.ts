import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070a",
          900: "#0a0e13",
          850: "#0e131a",
          800: "#131922",
          700: "#1b232e",
        },
      },
      maxWidth: {
        // Half the side margin the old max-w-6xl (72rem) container left.
        page: "calc(50vw + 36rem)",
        // Header bar: side margins at 75% of the page container's.
        header: "calc(62.5vw + 27rem)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        dash: {
          to: { strokeDashoffset: "-20" },
        },
      },
      animation: {
        "toast-in": "toast-in 180ms ease-out",
        dash: "dash 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
