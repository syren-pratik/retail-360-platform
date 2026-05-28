'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const from = params.get('from') ?? '/cx360';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.replace(from);
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
      }
    } catch {
      setError('Something went wrong. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <p className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            RCT Portal
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Retail Analytics Platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card p-8 space-y-5 shadow-lg"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide"
            >
              Access Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm border bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              style={{ borderColor: error ? '#f43f5e' : 'var(--border-default)' }}
            />
            {error && (
              <p className="text-xs text-rose-400 mt-1.5">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
            }}
          >
            {loading ? 'Verifying…' : 'Enter'}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
          Authorised access only
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
