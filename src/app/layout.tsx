import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navigation } from '@/components/navigation';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'Clickk Project Management',
  description: 'Internal project management tool for Clickk',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={manrope.variable} style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}

