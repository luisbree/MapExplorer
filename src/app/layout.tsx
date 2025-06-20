
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SimpleNotification } from '@/components/simple-notification';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Map Explorer',
  description: 'Explore the world with an interactive map.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <SimpleNotification />
      </body>
    </html>
  );
}
