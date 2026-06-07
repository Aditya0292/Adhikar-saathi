import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Cormorant Garamond", "Noto Serif Devanagari", "Georgia", "serif"],
        sans: ["DM Sans", "Noto Sans", "system-ui", "sans-serif"],
      },
      colors: {
        nyaya: {
          dark:         "#0A0E0B",
          dark2:        "#111A13",
          green:        "#1B4332",
          "green-mid":  "#2D6A4F",
          "green-bright":"#52B788",
          gold:         "#C9A84C",
          "gold-muted": "#8B6914",
          warm:         "#F7F5F0",
          text:         "#F0EDE6",
          muted:        "#8A9E8D",
          "text-dark":  "#1A1F1B",
        },
      },
      fontSize: {
        "display-2xl": ["clamp(3rem, 8vw, 7rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display-xl":  ["clamp(2.5rem, 6vw, 5.5rem)", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-lg":  ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md":  ["clamp(1.5rem, 3vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
      },
      animation: {
        "marquee":       "marquee 40s linear infinite",
        "marquee-pause": "marquee 40s linear infinite paused",
        "fade-up":       "fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in":       "fadeIn 0.6s ease forwards",
      },
      keyframes: {
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
