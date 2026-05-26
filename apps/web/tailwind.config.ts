import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'hsl(222 47% 5%)',
        fg: 'hsl(210 40% 96%)',
        muted: 'hsl(217 19% 35%)',
        accent: 'hsl(217 91% 60%)',
      },
    },
  },
  plugins: [],
};

export default config;
