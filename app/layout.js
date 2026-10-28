import './globals.css';

export const metadata = {
  title: 'R U Traders - Invoice',
  description: 'Invoice generator for R U Traders',
  authors: [{ name: 'Altamash Shaikh' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f766e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
