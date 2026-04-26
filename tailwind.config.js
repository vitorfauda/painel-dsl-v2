/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Mapped to new tokens (legacy names preserved for page compatibility)
        void: '#0a0a0a',
        deep: '#0a0a0a',
        surface: {
          glass: '#0f0f0f',
          elevated: '#161616',
        },
        'border-neon': 'rgba(255, 255, 255, 0.14)',
        'border-glass': 'rgba(255, 255, 255, 0.08)',
        primary: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.5)',
          foreground: '#000000',
        },
        accent: {
          gold: '#f59e0b',
          cyan: '#22d3ee',
          magenta: '#d946ef',
        },
        text: {
          primary: '#fafafa',
          muted: '#a1a1aa',
          dim: '#71717a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
      },
    },
  },
  plugins: [],
};
