import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/CartContext';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import TopBar from '@/components/TopBar';
import LoginGate from '@/components/LoginGate';

export const metadata: Metadata = {
  title: 'RestosPOS',
  description: 'Restaurant Point of Sale',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <LoginGate>
                <TopBar />
                <main style={{ flex: 1, overflow: 'hidden' }}>
                  {children}
                </main>
              </LoginGate>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
