'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/portal');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }
  if (user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success('Signed in');
      router.replace(u.role === 'admin' ? '/admin' : '/portal');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Sign in</h1>
        <p className="text-sm text-slate-500">Captains submit port entry requests. Operators use an admin account.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 maritime-gradient text-white font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
          >
            {busy ? '…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500">
          No account?{' '}
          <Link href="/register" className="text-primary font-bold">
            Register as captain
          </Link>
        </p>
      </div>
    </main>
  );
}
