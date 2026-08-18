import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "rgb(var(--border) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          strong: "rgb(var(--brand-strong) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          muted: "rgb(var(--brand-muted) / <alpha-value>)",
          border: "rgb(var(--brand-border) / <alpha-value>)",
        },
        identity: {
          DEFAULT: "rgb(var(--identity) / <alpha-value>)",
          strong: "rgb(var(--identity-strong) / <alpha-value>)",
          dark: "rgb(var(--identity-dark) / <alpha-value>)",
          soft: "rgb(var(--identity-soft) / <alpha-value>)",
          muted: "rgb(var(--identity-muted) / <alpha-value>)",
          border: "rgb(var(--identity-border) / <alpha-value>)",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.03), 0 8px 28px rgba(15,23,42,.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
