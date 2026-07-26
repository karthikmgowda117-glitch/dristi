/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFBFC",
        surface: "#FFFFFF",
        glass: "rgba(255,255,255,0.55)",
        "glass-border": "rgba(255,255,255,0.25)",
        primary: { DEFAULT: "#2563EB", 50: "#EFF4FF", 600: "#2563EB", 700: "#1D4ED8" },
        accent: { DEFAULT: "#06B6D4", 50: "#ECFEFF" },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        "ksp-gold": "#C9A227",
        "ksp-maroon": "#7A1F2B",
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E9F0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        kannada: ["\"Noto Sans Kannada\"", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "monospace"],
      },
      fontSize: {
        xs: "12px", sm: "14px", base: "16px", lg: "20px",
        xl: "24px", "2xl": "32px", "3xl": "40px",
      },
      spacing: {
        1: "4px", 2: "8px", 3: "12px", 4: "16px",
        6: "24px", 8: "32px", 12: "48px", 16: "64px",
      },
      backdropBlur: { premium: "16px" },
      boxShadow: {
        glass: "0 8px 32px rgba(17,24,39,0.06), 0 1px 0 rgba(255,255,255,0.6) inset",
        card: "0 1px 2px rgba(17,24,39,0.04), 0 1px 0 rgba(17,24,39,0.02)",
        elevated: "0 12px 40px rgba(17,24,39,0.10)",
        trace: "0 0 0 1px rgba(6,182,212,0.35), 0 0 24px rgba(6,182,212,0.18)",
      },
      borderRadius: { xl2: "20px" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        "trace-pulse": { "0%,100%": { opacity: 0.35 }, "50%": { opacity: 1 } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite linear",
        "trace-pulse": "trace-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
