import type { Config } from "tailwindcss";

/**
 * Design tokens from PRD §5.1. Components must use these tokens (e.g. `bg-accent`,
 * `text-status-ready`) and never raw hex values.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F8FAFC",
        line: "#E2E8F0",
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
        },
        accent: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          soft: "#EFF6FF",
          foreground: "#FFFFFF",
        },
        status: {
          received: "#475569",
          "in-repair": "#1D4ED8",
          "waiting-for-part": "#B45309",
          ready: "#15803D",
          delivered: "#64748B",
          cancelled: "#B91C1C",
        },
        "status-soft": {
          received: "#F1F5F9",
          "in-repair": "#EFF6FF",
          "waiting-for-part": "#FFFBEB",
          ready: "#F0FDF4",
          delivered: "#F1F5F9",
          cancelled: "#FEF2F2",
        },
        danger: {
          DEFAULT: "#B91C1C",
          soft: "#FEF2F2",
        },
        success: "#15803D",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // PRD §5.1 typography scale
        title: ["1.5rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        status: ["1.25rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        small: ["0.875rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        card: "0.75rem",
      },
      spacing: {
        touch: "3rem", // 48px primary targets
      },
      minHeight: {
        touch: "3rem",
      },
      minWidth: {
        touch: "2.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
