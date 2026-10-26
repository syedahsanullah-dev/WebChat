import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      spacing: {
        'header-mobile': '56px',
        'header-desktop': '64px',
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      colors: {
        wa: {
          dark: {
            bg: '#111b21',
            sidebar: '#202c33',
            header: '#202c33',
            border: '#222e35',
            input: '#2a3942',
            sent: '#005c4b',
            received: '#202c33',
            hover: '#202c33',
            active: '#2a3942',
            text: {
              primary: '#e9edef',
              secondary: '#8696a0',
              muted: '#667781',
            },
          },
          light: {
            bg: '#eae6df',
            sidebar: '#ffffff',
            header: '#f0f2f5',
            border: '#e9edef',
            input: '#f0f2f5',
            sent: '#d9fdd3',
            received: '#ffffff',
            hover: '#f5f6f6',
            active: '#ebebeb',
            text: {
              primary: '#111b21',
              secondary: '#667781',
              muted: '#8696a0',
            },
          },
          green: {
            DEFAULT: '#00a884',
            light: '#25d366',
            dark: '#008069',
          },
          blue: {
            tick: '#53bdeb',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
