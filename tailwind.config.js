/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate"

export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  		extend: {
  			colors: {
  				'bg-primary': 'rgb(var(--bg-primary) / <alpha-value>)',
  				'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
  				'icon-primary': 'rgb(var(--icon-primary) / <alpha-value>)',
  				'overlay': 'rgb(var(--overlay) / <alpha-value>)',
  			},
  			fontFamily: {
  				mono: ['JetBrains Mono', 'monospace'],
  			},
  		},
  },
  plugins: [animate],
}