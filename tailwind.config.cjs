/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // ==============================================================
        // The Study — dark editorial speakeasy palette (Direction A)
        // ==============================================================
        // New canonical token namespace. Prefer these in new components.
        study: {
          bg: '#0c0a08',
          card: '#161310',
          elevated: '#1e1a16',
          border: '#2e2720',
          'border-light': '#3d3428',
          text: '#e8e0d4',
          muted: '#9a8e7e',
          accent: '#c8a55c',
          'accent-hover': '#d4b76e',
          'accent-dim': 'rgba(200,165,92,0.15)',
          cream: '#f0e8da',
        },

        // ==============================================================
        // Existing semantic scales — REMAPPED for the dark theme so
        // existing component classes keep working.
        // ==============================================================
        // primary scale = brass-on-dark (the brand emphasis in The Study)
        primary: {
          DEFAULT: '#c8a55c',
          50: 'rgba(200,165,92,0.05)',
          100: 'rgba(200,165,92,0.1)',
          200: 'rgba(200,165,92,0.2)',
          300: '#d4b76e',
          400: '#cdaa60',
          500: '#c8a55c',
          600: '#a88945',          // text-primary-600 -> deeper brass
          700: '#896d34',          // text-primary-700 -> deepest brass
          800: '#5e4b22',
          900: '#332810',
          950: '#161310',
        },
        // accent scale = brass-gold tuned to The Study (#c8a55c)
        accent: {
          DEFAULT: '#c8a55c',
          50: '#f5e8c8',
          100: '#e8d4a0',
          200: '#dcc188',
          300: '#d4b76e',          // accentHover
          400: '#cdaa60',
          500: '#c8a55c',          // primary brass
          600: '#a88945',
          700: '#896d34',
          800: '#5e4b22',
          900: '#332810',
        },
        // cognac scale = warm muted text on dark
        cognac: {
          DEFAULT: '#9a8e7e',      // textMuted
          50: '#161310',
          100: '#1e1a16',
          200: '#2e2720',
          300: '#3d3428',
          400: '#7a6f60',
          500: '#9a8e7e',
          600: '#b5a99a',
          700: '#c8bca9',
          800: '#dcd0bd',
          900: '#f0e8da',
        },
        deepred: {
          DEFAULT: '#8B0000',
          500: '#8B0000',
        },
        // cream scale = light text colors on dark
        cream: {
          DEFAULT: '#e8e0d4',      // text
          50: '#f5efe2',           // brightest
          100: '#f0e8da',          // headlines
          200: '#e8e0d4',          // body text
        },
        // surface scale = neutral dark grays
        surface: {
          50: '#1e1a16',
          100: '#161310',
          200: '#2e2720',
          300: '#3d3428',
          400: '#5a4f42',
          500: '#7a6f60',
          600: '#9a8e7e',
          700: '#b5a99a',
          800: '#dcd0bd',
          900: '#f0e8da',
          950: '#f5efe2',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',

        // Legacy aliases — repointed for dark theme
        charcoal: '#f0e8da',       // was dark heading; now light cream
        freeze: '#ef4444',
        slushy: '#c8a55c',
        safe: '#10b981',
        warmgray: '#e8e0d4',       // was dark body; now light text

        // Tailwind built-in overrides so existing components adapt to dark.
        // bg-white -> dark elevated surface; text-white -> dark text on brass.
        white: '#1e1a16',
        black: '#0c0a08',
        gray: {
          50: '#1e1a16',
          100: '#161310',
          200: '#2e2720',
          300: '#3d3428',
          400: '#5a4f42',
          500: '#9a8e7e',
          600: '#b5a99a',
          700: '#c8bca9',
          800: '#dcd0bd',
          900: '#f0e8da',
          950: '#f5efe2',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(200, 165, 92, 0.15)',
        'glow-lg': '0 0 40px rgba(200, 165, 92, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
        'card-hover': '0 1px 3px rgba(0,0,0,0.4), 0 12px 28px rgba(0,0,0,0.35), 0 0 0 1px rgba(200,165,92,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c8a55c\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
