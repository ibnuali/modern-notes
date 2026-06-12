import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function LoginPage() {
  return (
    <section className="auth-card">
      <h1>Log in</h1>
      <p>Use your email and password to access notes.</p>
      <AuthForm mode="login" />
      <p>
        New here? <Link href="/register">Create account</Link>
      </p>
    </section>
  );
}
