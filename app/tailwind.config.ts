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
      borderRadius: {
        card: "1.125rem",
      },
      boxShadow: {
        card: "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -16px rgba(0, 0, 0, 0.7)",
        lift: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 2px 4px rgba(0, 0, 0, 0.35), 0 24px 56px -20px rgba(0, 0, 0, 0.85)",
      },
      maxWidth: {
        // Half the side margin the old max-w-6xl (72rem) container left.
        page: "calc(50vw + 36rem)",
        // Header bar: side margins at 75% of the page container's.
        header: "calc(62.5vw + 27rem)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
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
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.8)" },
        },
      },
      animation: {
        "toast-in": "toast-in 180ms ease-out",
        dash: "dash 1.4s linear infinite",
        rise: "rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
