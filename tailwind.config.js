/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./assets/**/*.js", // Scan all JS files in assets, including controllers
    "./templates/**/*.html.twig",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
