import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { CallProvider } from '@/context/CallContext';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'WebChat',
  description: 'Fast, secure, audio-calling WhatsApp Web clone',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WebChat',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#111b21' },
    { media: '(prefers-color-scheme: light)', color: '#f0f2f5' },
  ],
};

const foucScript = `
  (function() {
    try {
      var storedTheme = localStorage.getItem('webchat_theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (storedTheme === 'dark' || (!storedTheme && prefersDark) || !storedTheme) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{ __html: foucScript }}
        />
      </head>
      <body className="bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary antialiased min-h-screen selection:bg-wa-green selection:text-white">
        <ServiceWorkerRegister />
        <ThemeProvider>
          <AuthProvider>
            <WebSocketProvider>
              <CallProvider>
                {children}
              </CallProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
