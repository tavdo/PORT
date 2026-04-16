'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { registerCaptain } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { user, loading } = useAuth();
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
      await registerCaptain(email, password);
      toast.success('Account created — sign in');
      router.push('/login');
    } catch {
      toast.error('Could not register (email taken or invalid)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md glass-card p-8 space-y-6">
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Captain registration</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">Password (min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
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
            {busy ? '…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="text-primary font-bold">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
