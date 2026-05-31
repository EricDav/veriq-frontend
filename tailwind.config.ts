import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#111827",
          900: "#070B14",
          950: "#030508",
        },
        // Gold scale remapped to emerald (preserves all existing class names)
        gold: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#10B981",
          500: "#059669",
          600: "#047857",
          700: "#065F46",
          800: "#064E3B",
          900: "#022C22",
        },
        veriq: {
          primary:   "#070B14",
          secondary: "#10B981",
          accent:    "#10B981",
          surface:   "#F8FAFC",
          muted:     "#94A3B8",
          dark:      "#111827",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-pattern":  "linear-gradient(135deg, #070B14 0%, #111827 60%, #0D3D2E 100%)",
        "card-gradient": "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        "gold-gradient": "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      },
      animation: {
        "fade-up":  "fadeUp 0.6s ease-out forwards",
        "fade-in":  "fadeIn 0.4s ease-out forwards",
        "slide-in": "slideIn 0.5s ease-out forwards",
        float:      "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },
      boxShadow: {
        "card":      "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover":"0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        "nav":       "0 1px 0 rgba(0,0,0,0.08), 0 2px 16px rgba(0,0,0,0.04)",
        "glow":      "0 0 40px rgba(16,185,129,0.25)",
        "gold-glow": "0 0 32px rgba(16,185,129,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
