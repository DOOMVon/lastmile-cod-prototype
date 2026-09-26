/** @type {import('tailwindcss').Config} */
// Design tokens. Every interface pulls from this one file.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#EE4D2D", hover: "#D73F21", soft: "#FFF1ED", line: "#F8C5B8" },
        accent: { DEFAULT: "#F69113", soft: "#FFF6E8" },
        canvas: "#F5F5F5",
        ink: { DEFAULT: "#222222", muted: "#5F5F5F", subtle: "#8A8A8A" },
        line: { DEFAULT: "#E5E5E5", strong: "#CFCFCF" },
        disabled: { bg: "#F0F0F0", fg: "#A6A6A6" },
        success: { DEFAULT: "#1E7F4F", soft: "#EAF6EF" },
        warning: { DEFAULT: "#9A5B00", soft: "#FFF6E8" },
        danger: { DEFAULT: "#C62828", soft: "#FDECEC" },
        info: { DEFAULT: "#1F5FAE", soft: "#EBF2FB" },
        chat: "#E9EDF2",
        bezel: "#161616",
      },
      fontFamily: {
        sans: ["Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        // 12 / 13 / 14 / 16 / 18 / 22 scale
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        md: ["16px", "22px"],
        lg: ["18px", "24px"],
        xl: ["22px", "28px"],
      },
      borderRadius: {
        // 2px controls, 4px cards, 8px sheets/modals only
        sm: "2px",
        DEFAULT: "4px",
        lg: "8px",
      },
      backgroundImage: {
        // Shopee-style header band: two close oranges, no rainbow gradients.
        "brand-band": "linear-gradient(180deg, #EE4D2D 0%, #FF6633 100%)",
        "band-dots": "radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1.2px)",
      },
      backgroundSize: { dots: "18px 18px" },
      boxShadow: {
        device: "0 24px 48px rgba(34,34,34,0.22), 0 4px 12px rgba(34,34,34,0.12)",
        window: "0 16px 40px rgba(34,34,34,0.16)",
        // Elevation only for overlays and sticky bars.
        overlay: "0 8px 24px rgba(34,34,34,0.16)",
        bar: "0 -1px 0 #E5E5E5, 0 -4px 12px rgba(34,34,34,0.04)",
      },
    },
  },
  plugins: [],
};
