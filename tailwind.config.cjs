/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // "Timeless Bar" palette - sophisticated speakeasy aesthetic
        primary: {
          DEFAULT: '#1B3A4B', // Navy
          50: '#f0f5f7',
          100: '#d9e4e9',
          200: '#b3c9d3',
          300: '#8daebd',
          400: '#5d8a9e',
          500: '#3d6a7e',
          600: '#1B3A4B',
          700: '#162f3d',
          800: '#11242f',
          900: '#0c1921',
          950: '#070d11',
        },
        accent: {
          DEFAULT: '#B8860B', // Brass Gold
          50: '#fdf8eb',
          100: '#f9ebc7',
          200: '#f3d78f',
          300: '#edc357',
          400: '#d9a820',
          500: '#B8860B',
          600: '#946c09',
          700: '#705207',
          800: '#4c3805',
          900: '#281e03',
        },
        cognac: {
          DEFAULT: '#5D4037', // Cognac Brown
          50: '#f5f0ee',
          100: '#e6dcd8',
          200: '#cdb9b1',
          300: '#b4968a',
          400: '#8b6b5e',
          500: '#5D4037',
          600: '#4a332c',
          700: '#382721',
          800: '#251a16',
          900: '#130d0b',
        },
        deepred: {
          DEFAULT: '#8B0000', // Deep Red
          500: '#8B0000',
        },
        cream: {
          DEFAULT: '#FDF8F3',
          50: '#FFFFFF',
          100: '#FDF8F3',
          200: '#F5E6D8',
        },
        // Neutral grays with slight warmth
        surface: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Status colors - refined
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Legacy aliases
        charcoal: '#171717',
        freeze: '#ef4444',
        slushy: '#B8860B',
        safe: '#10b981',
        warmgray: '#4A4A4A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(27, 58, 75, 0.15)',
        'glow-lg': '0 0 40px rgba(27, 58, 75, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)',
        'card-hover': '0 1px 3px rgba(0,0,0,0.05), 0 25px 30px -5px rgba(0,0,0,0.1), 0 15px 15px -5px rgba(0,0,0,0.04)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 8s ease-in-out infinite',
        'float-delayed': 'floatDelayed 10s ease-in-out infinite',
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
        float: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(10px, -15px) rotate(2deg)' },
          '50%': { transform: 'translate(-5px, -25px) rotate(-1deg)' },
          '75%': { transform: 'translate(-15px, -10px) rotate(1deg)' },
        },
        floatDelayed: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(-20px, 15px) scale(1.02)' },
          '66%': { transform: 'translate(15px, -10px) scale(0.98)' },
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
