import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StudioSim',
  description: 'Browser-native studio simulations for practicing motion, edit rhythm, camera timing, and production judgment.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link className="brand" href="/">STUDIOSIM</Link>
            <div className="navlinks">
              <Link href="/courses">Courses</Link>
              <Link href="/marketplace">Marketplace</Link>
              <Link href="/creator">Creator</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/support">Support</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/login">Login</Link>
            </div>
          </nav>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
