import type { Metadata, Viewport } from 'next';
import './globals.css';
import './tabletop.css';
export const metadata: Metadata = {
  title: 'One Night Werewolf',
  description: 'One fire. One night. Who can you trust? A private multiplayer game for 3 to 10 friends.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1a1226' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preload" href="/fonts/silkscreen-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /><link rel="preload" href="/fonts/vt323-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head><body>{children}</body></html>;
}
