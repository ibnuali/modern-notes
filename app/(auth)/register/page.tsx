import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';

export default function RegisterPage() {
  return (
    <section className="auth-card">
      <h1>Create account</h1>
      <p>Start with email and a password of at least 8 characters.</p>
      <AuthForm mode="register" />
      <p>
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </section>
  );
}
