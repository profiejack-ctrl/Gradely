/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gradely: {
          blue: '#1E3A8A',    // Primary Blue: Trust, stability, authority, primary navigation
          orange: '#F97316',  // Vibrant Orange: Action, primary buttons, active states
          gold: '#FACC15',    // Academic Gold: Milestones, highlights, achievements
          green: '#22C55E',   // Progress Green: Growth, positive progress, passing status
          neutral: '#F8FAFC', // Neutral White: Backgrounds, clean canvas
          navy: '#0F172A',
        },
        brand: {
          50: '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d9fe',
          300: '#9cbdfd',
          400: '#6896fa',
          500: '#3b70f4',
          600: '#2554e8',
          700: '#1d41d4',
          800: '#1e36ab',
          900: '#1E3A8A', // Primary Gradely Blue
          950: '#172554',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#F97316', // Vibrant Gradely Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
