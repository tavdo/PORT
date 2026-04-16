'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getPortRequest } from '@/lib/api';
import { toShipInfo } from '@/lib/vesselDisplay';
import ShipInfoCard from '@/components/ShipInfoCard';
import ChargesTable from '@/components/ChargesTable';
import { Loader2 } from 'lucide-react';

export default function PortalRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof getPortRequest>> | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== 'captain') {
      router.replace('/admin');
      return;
    }
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    getPortRequest(n)
      .then(setData)
      .catch(() => router.replace('/portal'));
  }, [id, user, loading, router]);

  if (loading || !user || user.role !== 'captain') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const ship = toShipInfo(data.vesselData as unknown as Record<string, unknown>);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/portal" className="text-sm font-bold text-primary">
          ← Back to port entry
        </Link>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h1 className="text-2xl font-black text-navy dark:text-white uppercase">Request #{data.id}</h1>
          <span
            className={
              data.status === 'approved'
                ? 'text-green-600 font-bold'
                : data.status === 'rejected'
                  ? 'text-red-600 font-bold'
                  : 'text-amber-600 font-bold'
            }
          >
            {data.status}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          IMO <span className="font-mono font-bold">{data.imo}</span>
          {data.eta ? ` · ETA ${data.eta}` : ''}
        </p>
        {data.cargoNotes && <p className="text-sm bg-white dark:bg-slate-900 p-4 rounded-xl border">{data.cargoNotes}</p>}
        <div className="grid md:grid-cols-2 gap-6">
          {ship && (
            <div>
              <ShipInfoCard ship={ship} />
            </div>
          )}
          <div className="glass-card p-6 space-y-2">
            <p className="text-xs font-black uppercase text-slate-400">Totals</p>
            <p className="text-lg">
              Estimated: <strong>${data.estimatedTotalUsd?.toLocaleString()}</strong>
            </p>
            {data.approvedTotalUsd != null && (
              <p className="text-lg text-green-600">
                Approved: <strong>${data.approvedTotalUsd.toLocaleString()}</strong>
              </p>
            )}
          </div>
        </div>
        {data.charges && <ChargesTable sections={data.charges.sections} />}
      </div>
    </main>
  );
}
