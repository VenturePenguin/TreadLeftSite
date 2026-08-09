import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f97316',
          navy: '#0f172a',
          slate: '#64748b',
          blue: '#3b82f6',
          teal: '#14b8a6',
          light: '#f1f5f9',
          card: '#ffffff',
          border: '#e2e8f0',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
