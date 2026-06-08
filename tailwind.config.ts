import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#667085",
        line: "#d8dee8",
        campus: "#0f6b58",
        "campus-ink": "#083f35",
        gold: "#b88a2f"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
