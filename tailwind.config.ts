import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: {
          DEFAULT: '#f8f6f1',
          panel: '#ffffff',
          soft: '#f3efe8',
          hover: '#ebe5d9',
          active: '#fdf5e5',
        },
        // Text
        ink: {
          DEFAULT: '#1a1814',
          soft: '#4a4438',
          mute: '#8a8473',
          faint: '#b5ad9c',
        },
        // Borders
        line: {
          DEFAULT: '#d8d2c3',
          soft: '#e8e3d7',
        },
        // Brand/Accent
        amber: {
          DEFAULT: '#c88a1a',
          hot: '#d84a1a',
        },
        sage: '#6a8a68',
        rust: '#a44535',
        ocean: '#3a6a80',
        plum: '#7a4a6a',
        // Rules
        rule: {
          r1: '#6a8a68',
          r2: '#c88a1a',
          r3: '#3a6a80',
          r4: '#7a4a6a',
          r5: '#d84a1a',
          r6: '#3a6a5a',
          r7: '#a44535',
          sayorana: '#5a5040',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        lg: '14px',
      },
      boxShadow: {
        modal: '0 24px 60px -20px rgba(26, 24, 20, 0.28), 0 4px 12px -4px rgba(26, 24, 20, 0.12)',
        pop: '0 8px 24px -8px rgba(26, 24, 20, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
