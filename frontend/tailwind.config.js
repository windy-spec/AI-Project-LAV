/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        danger: "pulse-red 1.5s infinite",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.7)" },
          "50%": { boxShadow: "0 0 0 20px rgba(239, 68, 68, 0)" },
        },
      },
    },
  },
  plugins: [],
};
