'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  createPortRequest,
  listMyPortRequests,
  CAPTAIN_DEFAULT_HOURS,
  CAPTAIN_DEFAULT_USD_TO_GEL,
  type PortRequestPayload,
  downloadPdfPost,
  getExportXlsxUrl,
  type CalculationParams,
} from '@/lib/api';
import { extractImoFromText } from '@/lib/commandParser';
import ShipInfoCard from '@/components/ShipInfoCard';
import ChargesTable from '@/components/ChargesTable';
import TotalCard from '@/components/TotalCard';
import { toast, Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function PortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<Awaited<ReturnType<typeof listMyPortRequests>>>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    ship: import('@/lib/api').ShipInfo;
    charges: import('@/lib/api').CalculateResponse['charges'];
    totalUSD: number;
    totalGEL: number;
  } | null>(null);
  const [lastSubmit, setLastSubmit] = useState<CalculationParams | null>(null);

  const [imo, setImo] = useState('');
  const [eta, setEta] = useState('');
  const [cargoNotes, setCargoNotes] = useState('');
  const [cargoWeightTn, setCargoWeightTn] = useState('');
  const [hours, setHours] = useState(String(CAPTAIN_DEFAULT_HOURS));
  const [usdToGel, setUsdToGel] = useState(String(CAPTAIN_DEFAULT_USD_TO_GEL));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'captain') {
      router.replace('/admin');
      return;
    }
    listMyPortRequests()
      .then(setList)
      .catch(() => toast.error('Could not load requests'))
      .finally(() => setLoadingList(false));
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const imoClean = extractImoFromText(imo) || imo.replace(/\D/g, '').slice(0, 7);
    if (!/^\d{7}$/.test(imoClean)) {
      toast.error('Valid 7-digit IMO required');
      return;
    }
    const h = Number(hours) || CAPTAIN_DEFAULT_HOURS;
    const fx = Number(usdToGel) || CAPTAIN_DEFAULT_USD_TO_GEL;
    const body: PortRequestPayload = {
      imo: imoClean,
      hours: h,
      usdToGel: fx,
      eta: eta.trim() || undefined,
      cargoNotes: cargoNotes.trim() || undefined,
    };
    if (cargoWeightTn.trim() !== '') body.cargoWeightTn = Number(cargoWeightTn);

    const calcParams: CalculationParams = {
      imo: imoClean,
      hours: h,
      usdToGel: fx,
    };
    if (cargoWeightTn.trim() !== '') calcParams.cargoWeightTn = Number(cargoWeightTn);

    setSubmitting(true);
    try {
      const res = await createPortRequest(body);
      setLastSubmit(calcParams);
      setLastResult({
        ship: res.ship,
        charges: res.charges,
        totalUSD: res.totalUSD,
        totalGEL: res.totalGEL,
      });
      toast.success('Request submitted — pending review');
      const refreshed = await listMyPortRequests();
      setList(refreshed);
    } catch {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.role !== 'captain') {
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
          <h1 className="text-3xl font-black text-navy dark:text-white uppercase tracking-tight">Port entry</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Submit your vessel IMO. We fetch live particulars and estimate disbursement. Track approval below.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={onSubmit} className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-primary">New request</h2>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">IMO *</label>
              <input
                required
                value={imo}
                onChange={(e) => setImo(e.target.value)}
                className="mt-1 w-full font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
                placeholder="9341897"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Port hours</label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">USD/GEL</label>
                <input
                  type="number"
                  step="0.01"
                  value={usdToGel}
                  onChange={(e) => setUsdToGel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">ETA (optional)</label>
              <input
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2"
                placeholder="2026-04-20 14:00 UTC"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Cargo notes (optional)</label>
              <textarea
                value={cargoNotes}
                onChange={(e) => setCargoNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Cargo weight tn (optional)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={cargoWeightTn}
                onChange={(e) => setCargoWeightTn(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 maritime-gradient text-white font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>

          {lastResult && (
            <div className="space-y-6">
              <ShipInfoCard ship={lastResult.ship} />
              <TotalCard
                usd={lastResult.totalUSD}
                gel={lastResult.totalGEL}
                onDownloadPdf={async () => {
                  if (!lastSubmit) return;
                  const blob = await downloadPdfPost({ ...lastSubmit, kind: 'pda' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                onDownloadXlsx={() => {
                  if (!lastSubmit) return;
                  window.open(
                    getExportXlsxUrl(lastSubmit.imo, lastSubmit.hours, lastSubmit.usdToGel, 'pda'),
                    '_blank',
                  );
                }}
              />
              <ChargesTable sections={lastResult.charges.sections} />
            </div>
          )}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-navy dark:text-white">Your requests</h2>
          {loadingList ? (
            <Loader2 className="animate-spin text-primary" />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">IMO</th>
                    <th className="p-3">Vessel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Est. USD</th>
                    <th className="p-3">Approved</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="p-3 font-mono">{r.id}</td>
                      <td className="p-3 font-mono">{r.imo}</td>
                      <td className="p-3">{r.vesselData?.name ?? '—'}</td>
                      <td className="p-3">
                        <span
                          className={
                            r.status === 'approved'
                              ? 'text-green-600 font-bold'
                              : r.status === 'rejected'
                                ? 'text-red-600 font-bold'
                                : 'text-amber-600 font-bold'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">{r.estimatedTotalUsd?.toLocaleString?.() ?? r.estimatedTotalUsd}</td>
                      <td className="p-3">
                        {r.approvedTotalUsd != null ? r.approvedTotalUsd.toLocaleString() : '—'}
                      </td>
                      <td className="p-3">
                        <Link href={`/portal/requests/${r.id}`} className="text-primary font-bold">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <p className="p-8 text-center text-slate-500">No requests yet — submit your first entry above.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
