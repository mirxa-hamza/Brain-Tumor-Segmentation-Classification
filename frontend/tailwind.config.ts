import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          glow: "var(--primary-glow)",
          foreground: "var(--primary-foreground)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        destructive: "var(--destructive)",
        tumor: {
          ncr: "var(--tumor-ncr)",
          ed: "var(--tumor-ed)",
          et: "var(--tumor-et)",
        },
      },
      fontFamily: {
        // "Google Sans" has no public webfont release; Roboto is the closest open
        // relative and is used for all UI text, including numeric/tabular data.
        sans: ["var(--font-sans)", "Roboto", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "Roboto", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        glow: "0 0 0 1px var(--primary), 0 0 24px -4px var(--primary-glow)",
        card: "0 1px 2px 0 rgb(0 0 0 / 0.4), 0 0 0 1px var(--border)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
