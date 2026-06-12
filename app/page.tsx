import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <section className="hero">
      <p className="eyebrow">Modern notes</p>
      <h1>Capture thoughts with an account that stays signed in.</h1>
      <p>Register, log in, and continue to your private notes workspace after refresh.</p>
      <div className="actions">
        <Link className="button" href={user ? '/notes' : '/register'}>
          {user ? 'Open notes' : 'Create account'}
        </Link>
        {!user ? <Link href="/login">Log in</Link> : null}
      </div>
    </section>
  );
}
