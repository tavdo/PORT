'use client';

import { useState } from 'react';
import {
  calculatePDA,
  CalculateResponse,
  downloadPdfPost,
  getExportXlsxUrl,
  CAPTAIN_DEFAULT_USD_TO_GEL,
  type CalculationParams,
} from '@/lib/api';
import { mergeCaptainParams } from '@/lib/commandParser';
import InputForm from '@/components/InputForm';
import ShipInfoCard from '@/components/ShipInfoCard';
import ChargesTable from '@/components/ChargesTable';
import TotalCard from '@/components/TotalCard';
import CaptainCommandBar from '@/components/CaptainCommandBar';
import QuickPresets from '@/components/QuickPresets';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Anchor, HelpCircle, Info, Search, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<CalculateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastParams, setLastParams] = useState<CalculationParams | null>(null);
  const [syncParams, setSyncParams] = useState<Partial<CalculationParams>>({});

  const handleCalculate = async (params: CalculationParams) => {
    setLoading(true);
    setLastParams(params);
    try {
      const result = await calculatePDA(params);
      setData(result);
      toast.success('Estimate ready');
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      toast.error(message || 'Command Execution Failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (hours: number) => {
    const imo = syncParams.imo?.trim();
    if (!imo || !/^\d{7}$/.test(imo)) {
      toast.error('Enter your ship’s IMO in the bar above first');
      return;
    }
    const next = mergeCaptainParams({
      ...syncParams,
      imo,
      hours,
      usdToGel: syncParams.usdToGel ?? CAPTAIN_DEFAULT_USD_TO_GEL,
    });
    if (!next) {
      toast.error('Could not build calculation');
      return;
    }
    setSyncParams(next);
    handleCalculate(next);
  };

  const handleDownloadPdf = async () => {
    if (!lastParams) return;
    try {
      const blob = await downloadPdfPost({ ...lastParams, kind: 'pda' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('PDF download failed');
    }
  };

  const handleDownloadXlsx = () => {
    if (!lastParams) return;
    window.open(
      getExportXlsxUrl(lastParams.imo, lastParams.hours, lastParams.usdToGel, 'pda'),
      '_blank',
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12">
      <Toaster position="bottom-right" />

      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 group">
            <div className="p-4 maritime-gradient rounded-3xl shadow-xl shadow-primary/20 rotate-[-5deg] group-hover:rotate-0 transition-transform duration-500">
              <Anchor size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-navy dark:text-white tracking-tight uppercase">
                Captain's <span className="text-primary italic">Command</span>
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" /> Secure Tactical Disbursement Console
              </p>
            </div>
          </div>

          <div className="hidden md:flex gap-6 items-center">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Status</p>
              <div className="text-xs font-bold text-green-500 flex items-center justify-end gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ONLINE
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="p-3 text-slate-400 hover:text-primary transition-colors">
                <HelpCircle size={20} />
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <CaptainCommandBar onExecute={handleCalculate} syncParams={setSyncParams} />
          <QuickPresets onSelect={handleQuickPreset} />
        </section>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <section className="lg:col-span-4 space-y-8 sticky top-12">
            <div className="glass-card p-8">
              <InputForm onCalculate={handleCalculate} isLoading={loading} externalParams={syncParams} />
            </div>

            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">Model</p>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                tanker-batumi / batumi-tanker.json
              </div>
            </div>
          </section>

          <section className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {data ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  className="space-y-8"
                >
                  <div className="grid md:grid-cols-2 gap-8 items-stretch">
                    <div className="h-full">
                      <ShipInfoCard ship={data.ship} />
                    </div>
                    <div className="h-full">
                      <TotalCard
                        usd={data.totalUSD}
                        gel={data.totalGEL}
                        onDownloadPdf={handleDownloadPdf}
                        onDownloadXlsx={handleDownloadXlsx}
                      />
                    </div>
                  </div>

                  <ChargesTable sections={data.charges.sections} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[600px] glass-card flex flex-col items-center justify-center text-center p-12 border-dashed"
                >
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Search className="text-slate-300" size={40} aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold text-navy dark:text-white mb-3">No Data to Display</h3>
                  <p className="text-slate-500 max-w-sm">
                    Enter IMO and parameters to generate a proforma aligned with the Batumi tanker workbook (PDA/FDA
                    structure).
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>

      <footer className="mt-20 py-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">
          Port Disbursement Calculator &copy; 2026
        </p>
      </footer>
    </main>
  );
}
