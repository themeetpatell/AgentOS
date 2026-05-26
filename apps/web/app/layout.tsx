import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Finanshels Neuro',
  description: 'Internal AI agent platform for Finanshels GTM and people functions.',
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
