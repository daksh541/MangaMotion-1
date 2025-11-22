/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy/charcoal background
        'dark-bg': '#0F1419',
        'dark-bg-alt': '#0a0d11',
        
        // Neon accents
        'neon-purple': '#A855F7',
        'neon-blue': '#3B82F6',
        'neon-pink': '#EC4899',
      },
      backdropBlur: {
        'glass': '12px',
      },
      boxShadow: {
        'glass': '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        'glass-hover': '0 25px 40px -5px rgba(168, 85, 247, 0.1)',
        'neon-glow': '0 0 12px rgba(168, 85, 247, 0.6)',
        'neon-glow-sm': '0 0 8px rgba(168, 85, 247, 0.4)',
      },
      keyframes: {
        'neon-glow': {
          '0%, 100%': {
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 16px rgba(168, 85, 247, 0.8)',
          },
        },
        'pulse-soft': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.01)',
          },
        },
        'underline-fade': {
          '0%': {
            backgroundPosition: '-200% center',
            opacity: '0',
          },
          '100%': {
            backgroundPosition: '200% center',
            opacity: '1',
          },
        },
        'chevron-rotate': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(180deg)',
          },
        },
      },
      animation: {
        'neon-glow': 'neon-glow 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 400ms ease-in-out',
        'underline-fade': 'underline-fade 300ms ease-out forwards',
        'chevron-rotate': 'chevron-rotate 300ms ease-out',
      },
      backgroundImage: {
        'neon-gradient': 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)',
        'neon-gradient-h': 'linear-gradient(90deg, #A855F7 0%, #3B82F6 50%, #EC4899 100%)',
      },
    },
  },
  plugins: [],
};
