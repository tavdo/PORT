'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminListRequests, adminPatchRequest, adminAudit } from '@/lib/api';
import { toast, Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListRequests>>>([]);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof adminAudit>>>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [overrideUsd, setOverrideUsd] = useState<Record<number, string>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/portal');
      return;
    }
    adminListRequests().then(setRows).catch(() => toast.error('Failed to load'));
    adminAudit(50).then(setAudit).catch(() => {});
  }, [user, loading, router]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const raw = overrideUsd[id]?.trim();
      const approvedTotalUsd =
        action === 'approve' && raw !== '' && raw !== undefined ? Number(raw) : undefined;
      await adminPatchRequest(id, action, approvedTotalUsd);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      setRows(await adminListRequests());
      setAudit(await adminAudit(50));
    } catch {
      toast.error('Action failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <Toaster position="bottom-right" />
      <div className="max-w-7xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-black text-navy dark:text-white uppercase">Admin — port requests</h1>
          <p className="text-slate-500 text-sm mt-1">Review vessel data, confirm or override price, approve or reject.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Captain</th>
                <th className="p-3">IMO</th>
                <th className="p-3">Vessel</th>
                <th className="p-3">Status</th>
                <th className="p-3">Est. USD</th>
                <th className="p-3 min-w-[200px]">Override USD</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
                  <td className="p-3 font-mono">{r.id}</td>
                  <td className="p-3">{r.userEmail}</td>
                  <td className="p-3 font-mono">{r.imo}</td>
                  <td className="p-3 max-w-[180px]">{r.vesselData?.name ?? '—'}</td>
                  <td className="p-3 font-bold">{r.status}</td>
                  <td className="p-3">{r.estimatedTotalUsd?.toLocaleString?.()}</td>
                  <td className="p-3">
                    {r.status === 'pending' ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Default ${r.estimatedTotalUsd}`}
                        value={overrideUsd[r.id] ?? ''}
                        onChange={(e) => setOverrideUsd((o) => ({ ...o, [r.id]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3 space-y-1">
                    {r.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, 'approve')}
                          className="block w-full py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, 'reject')}
                          className="block w-full py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-slate-500">No requests.</p>}
        </div>

        <section>
          <h2 className="text-lg font-black uppercase mb-3 text-navy dark:text-white">Recent audit</h2>
          <ul className="text-xs space-y-1 font-mono text-slate-600 dark:text-slate-400 max-h-48 overflow-y-auto">
            {audit.map((a) => (
              <li key={a.id}>
                {a.createdAt} — {a.action} {a.entityType}{' '}
                {a.details ? JSON.stringify(a.details) : ''}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
