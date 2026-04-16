'use client';

import { Ship, Clock, Zap, Anchor } from 'lucide-react';
import { motion } from 'framer-motion';

const PRESETS = [
  { label: 'Short Ops', hours: 12, icon: Zap, color: 'text-amber-500' },
  { label: 'Standard Tanker', hours: 150, icon: Ship, color: 'text-primary' },
  { label: 'Extended Stay', hours: 360, icon: Clock, color: 'text-blue-500' },
  { label: 'Emergency Call', hours: 6, icon: Anchor, color: 'text-red-500' },
];

interface QuickPresetsProps {
  onSelect: (hours: number) => void;
}

export default function QuickPresets({ onSelect }: QuickPresetsProps) {
  return (
    <div className="flex flex-col gap-4 mb-12">
      <div className="flex items-center gap-3 px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Quick Mission Presets</h3>
        <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PRESETS.map((preset, idx) => {
          const Icon = preset.icon;
          return (
            <motion.button
              key={preset.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(preset.hours)}
              className="group glass-card p-6 flex flex-col items-center gap-3 text-center hover:bg-white dark:hover:bg-slate-900 transition-colors border-2 border-transparent hover:border-primary/20"
            >
              <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 group-hover:bg-white dark:group-hover:bg-slate-900 transition-all ${preset.color}`}>
                <Icon size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-navy dark:text-white uppercase tracking-tight">{preset.label}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{preset.hours} Hours</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
