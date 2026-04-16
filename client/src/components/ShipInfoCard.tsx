'use client';

import { ShipInfo } from '@/lib/api';
import { Ship, Anchor, Ruler, Maximize, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface ShipInfoCardProps {
  ship: ShipInfo;
}

export default function ShipInfoCard({ ship }: ShipInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Ship size={24} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-navy dark:text-white uppercase">{ship.name}</h2>
          <p className="text-sm text-slate-500 font-medium">{ship.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoItem icon={<Activity size={16} />} label="Gross Tonnage" value={`${ship.grt.toLocaleString()} GRT`} />
        <InfoItem icon={<Activity size={16} />} label="Reduced GRT" value={`${ship.reducedGrt.toLocaleString()}`} />
        <InfoItem icon={<Ruler size={16} />} label="L × B × D" value={`${ship.length} × ${ship.width} × ${ship.depthM} m`} />
        <InfoItem icon={<Maximize size={16} />} label="L×B×D product" value={ship.lbd.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
        <InfoItem icon={<Anchor size={16} />} label="Registry" value="International" />
      </div>
    </motion.div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-bold text-navy dark:text-slate-100">{value}</span>
    </div>
  );
}
