import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReduxProvider } from '@/store/provider';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { AuthProvider } from '@/lib/auth/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nexus - Fundraising Intelligence Platform',
  description: 'AI-powered fundraising assistant for non-profits',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          <AuthProvider>
            <ReactQueryProvider>{children}</ReactQueryProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
