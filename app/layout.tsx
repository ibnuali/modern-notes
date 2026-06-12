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
        <header className="site-header">
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
        <main>{children}</main>
      </body>
    </html>
  );
}
