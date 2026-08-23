import './globals.css';

export const metadata = {
  title: 'OIDC Provider (demo)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
