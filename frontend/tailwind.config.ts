import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FB",
        surface: "#FFFFFF",
        primary: "#1A3E82",
        accent: "#0A84FF",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["var(--font-inter, ui-sans-serif, system-ui, sans-serif)", "Inter", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
