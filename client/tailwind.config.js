/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'field': '#060c1e',
        'card': '#0b1830',
        'accent': '#c9a535',
        'gold': '#e8d080',
        'muted': '#6b8ab8',
        'border': '#1a3260',
        'surface': '#0f2040',
        'surface2': '#162d52'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
};
