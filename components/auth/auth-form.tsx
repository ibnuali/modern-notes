'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'register';

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: String(formData.get('name') ?? ''),
    };

    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? 'Unable to authenticate with those credentials.');
      setIsSubmitting(false);
      return;
    }

    router.push('/notes');
    router.refresh();
  }

  const isRegister = mode === 'register';

  return (
    <form onSubmit={onSubmit} className="auth-form">
      {isRegister ? (
        <label>
          Name
          <input name="name" type="text" autoComplete="name" />
        </label>
      ) : null}

      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>

      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 8 : 1}
          required
        />
      </label>

      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
      </button>
    </form>
  );
}
