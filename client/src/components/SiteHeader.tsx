'use client';

import Link from 'next/link';
import { Anchor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SiteHeader() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-black uppercase tracking-tight text-navy dark:text-white text-sm md:text-base"
        >
          <Anchor className="text-primary shrink-0" size={22} aria-hidden />
          Port Disbursement
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Link href="/" className="hover:text-primary transition-colors">
            Calculator
          </Link>
          {user?.role === 'captain' && (
            <Link href="/portal" className="hover:text-primary transition-colors">
              Port entry
            </Link>
          )}
          {user?.role === 'admin' && (
            <>
              <Link href="/admin" className="hover:text-primary transition-colors">
                Admin
              </Link>
              <Link href="/admin/pricing" className="hover:text-primary transition-colors">
                Pricing
              </Link>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="hover:text-primary transition-colors">
                Log in
              </Link>
              <Link href="/register" className="hover:text-primary transition-colors">
                Register
              </Link>
            </>
          )}
          {user && (
            <button
              type="button"
              onClick={logout}
              className="text-slate-500 hover:text-primary transition-colors font-medium"
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
