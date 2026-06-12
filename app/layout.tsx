import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Modern notes app',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <header className="site-header" role="banner">
          <Link href="/" className="brand">Notes</Link>
          <nav aria-label="Main navigation">
            {user ? (
              <>
                <Link href="/notes">My notes</Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/register">Create account</Link>
              </>
            )}
          </nav>
        </header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
