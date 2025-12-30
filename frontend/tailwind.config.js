/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fractionate Design System Colors
        neon: {
          bg: '#0d0d0d',
          surface: '#161616',
          'surface-hover': '#1a1a1a',
          border: '#2a2a2a',
          'border-focus': '#3a3a3a',
          text: '#ffffff',
          'text-secondary': '#a0a0a0',
          'text-muted': '#666666',
          accent: '#ffffff',
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          info: '#3b82f6',
          cyan: '#1f8cf9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
      },
      boxShadow: {
        'neon': '0 8px 40px rgba(0, 0, 0, 0.6)',
        'neon-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'neon-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'neon-lg': '0 8px 40px rgba(0, 0, 0, 0.6)',
        'neon-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
