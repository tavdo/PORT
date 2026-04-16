'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { adminGetPricing, adminPutPricing, adminDeletePricingKey } from '@/lib/api';
import { toast, Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function AdminPricingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hint, setHint] = useState('');
  const [extraKeys, setExtraKeys] = useState<string[]>([]);
  const [entries, setEntries] = useState<Array<{ key: string; value: number; updatedAt: string }>>([]);
  const [newKey, setNewKey] = useState('berthPerGrtUsd');
  const [newVal, setNewVal] = useState('0.15');
  const [saving, setSaving] = useState(false);

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
    adminGetPricing()
      .then((d) => {
        setEntries(d.entries);
        setExtraKeys(d.extraKeys);
        setHint(d.hint);
      })
      .catch(() => toast.error('Failed to load pricing'));
  }, [user, loading, router]);

  const saveBatch = async () => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.key] = e.value;
    }
    const v = Number(newVal);
    if (newKey.trim() && Number.isFinite(v)) {
      map[newKey.trim()] = v;
    }
    setSaving(true);
    try {
      await adminPutPricing(map);
      toast.success('Pricing saved');
      const d = await adminGetPricing();
      setEntries(d.entries);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (key: string) => {
    try {
      await adminDeletePricingKey(key);
      setEntries((e) => e.filter((x) => x.key !== key));
      toast.success('Removed override');
    } catch {
      toast.error('Delete failed');
    }
  };

  const updateLocal = (key: string, value: string) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    setEntries((rows) => rows.map((r) => (r.key === key ? { ...r, value: n } : r)));
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
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/admin" className="text-sm font-bold text-primary">
          ← Admin
        </Link>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase">Pricing configuration</h1>
        <p className="text-sm text-slate-500">{hint}</p>
        <p className="text-xs text-slate-400">
          Extra keys: {extraKeys.join(', ') || '—'} — use cargo weight (tn) with cargoPerTnUsd, LOA with lengthAdjustmentPerMUsd,
          or customFlatFeeUsd.
        </p>

        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.key} className="flex gap-2 items-center">
              <span className="font-mono text-xs flex-1">{e.key}</span>
              <input
                type="number"
                step="any"
                value={e.value}
                onChange={(ev) => updateLocal(e.key, ev.target.value)}
                className="w-32 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => remove(e.key)} className="text-xs text-red-600 font-bold">
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="glass-card p-4 space-y-3">
          <p className="text-xs font-black uppercase text-primary">Add / update key</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 font-mono text-sm"
              placeholder="e.g. agencyLumpsumUsd"
            />
            <input
              type="number"
              step="any"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              className="w-36 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveBatch}
            className="px-6 py-3 maritime-gradient text-white font-black uppercase text-sm rounded-xl disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>
    </main>
  );
}
