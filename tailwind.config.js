/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./assets/react/**/*.{js,ts,jsx,tsx}", // Updated path for React components
    "./templates/**/*.html.twig", // Added path for Twig templates
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
