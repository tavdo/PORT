'use client';

import { motion } from 'framer-motion';
import { Download, CreditCard, FileSpreadsheet } from 'lucide-react';

interface TotalCardProps {
  usd: number;
  gel: number;
  onDownloadPdf: () => void;
  onDownloadXlsx: () => void;
}

export default function TotalCard({ usd, gel, onDownloadPdf, onDownloadXlsx }: TotalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="maritime-gradient-blue text-white p-8 rounded-3xl shadow-2xl flex flex-col gap-6"
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/20 rounded-xl">
          <CreditCard size={24} />
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all backdrop-blur-sm border border-white/20"
          >
            <Download size={16} />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={onDownloadXlsx}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all backdrop-blur-sm border border-white/20"
          >
            <FileSpreadsheet size={16} />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-widest text-white/70">Estimated Total</p>
        <h2 className="text-5xl font-black font-mono tracking-tighter">
          ${usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </h2>
        <div className="flex items-center gap-2 pt-2">
          <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-black uppercase">GEL</span>
          <span className="text-xl font-bold opacity-90">
            {gel.toLocaleString(undefined, { minimumFractionDigits: 2 })} ₾
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-white/20">
        <p className="text-xs text-white/60 leading-relaxed">
          Tanker Batumi tariff engine with MTA environment table and GEL harbour schedules. Subject to final agency
          confirmation.
        </p>
      </div>
    </motion.div>
  );
}
