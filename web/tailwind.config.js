/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
          dark: "#3730A3",
          container: "#4F46E5",
          "on-container": "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1E293B",
          muted: "#64748B",
          container: "#D5E0F8",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          background: "#F8FAFC",
          low: "#F1F5F9",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        slate: {
          850: "#131C2E",
          950: "#090D16",
        }
      },
      fontFamily: {
        sans: ["'Inter'", "sans-serif"],
        headline: ["'Plus Jakarta Sans'", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 10px 25px -3px rgba(15, 23, 42, 0.1)',
        'glow': '0 0 20px -5px rgba(79, 70, 229, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
