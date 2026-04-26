import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F4ECDC",
          2: "#EDE3CF",
          3: "#E2D6BA",
          4: "#D6C8A6",
        },
        ink: {
          DEFAULT: "#1A1612",
          2: "#3A332A",
          3: "#6E6354",
          4: "#998D7A",
        },
        rule: {
          DEFAULT: "rgba(26,22,18,0.14)",
          strong: "rgba(26,22,18,0.32)",
        },
        accent: {
          DEFAULT: "#B43A26",
          2: "#1F3A55",
        },
        moss: "#4A6E4A",
        ochre: "#A77523",
        clay: "#8A4F3D",
        trust: {
          high: "#4A6E4A",
          medium: "#3B5C7A",
          low: "#A77523",
          quarantined: "#B43A26",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: [
          '"Fraunces"',
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          "ui-serif",
          "Georgia",
          "serif",
        ],
        serif: [
          '"Fraunces"',
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          "Georgia",
          "serif",
        ],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        none: "0",
        sm: "1px",
        DEFAULT: "2px",
      },
      boxShadow: {
        letterpress: "3px 3px 0 #1A1612",
        letterpressSm: "2px 2px 0 #1A1612",
        none: "none",
      },
      keyframes: {
        slowfade: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        slowfade: "slowfade 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
