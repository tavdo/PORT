'use client';

import { useState, useEffect } from 'react';
import { Search, Wallet, Clock, Loader2, Anchor, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalculationParams } from '@/lib/api';
import { CAPTAIN_DEFAULT_HOURS, CAPTAIN_DEFAULT_USD_TO_GEL } from '@/lib/api';
import { extractImoFromText } from '@/lib/commandParser';

interface InputFormProps {
  onCalculate: (params: CalculationParams) => void;
  isLoading: boolean;
  externalParams?: Partial<CalculationParams>;
}

export default function InputForm({ onCalculate, isLoading, externalParams }: InputFormProps) {
  const [imo, setImo] = useState('');
  const [hours, setHours] = useState(String(CAPTAIN_DEFAULT_HOURS));
  const [rate, setRate] = useState(String(CAPTAIN_DEFAULT_USD_TO_GEL));
  const [reducedGrt, setReducedGrt] = useState('');
  const [depthM, setDepthM] = useState('');
  const [nightPilotIn, setNightPilotIn] = useState(false);
  const [nightPilotOut, setNightPilotOut] = useState(false);
  const [holidayTowageOut, setHolidayTowageOut] = useState(false);
  const [holidayMooringIn, setHolidayMooringIn] = useState(false);
  const [holidayMooringOut, setHolidayMooringOut] = useState(false);
  const [freshWaterTn, setFreshWaterTn] = useState('');
  const [anchorageDays, setAnchorageDays] = useState('');
  const [cargoWeightTn, setCargoWeightTn] = useState('');
  const [includeCertificates, setIncludeCertificates] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  // Effect to sync when externalParams change
  useEffect(() => {
    if (externalParams?.imo) setImo(externalParams.imo);
    if (externalParams?.hours) setHours(externalParams.hours.toString());
    if (externalParams?.usdToGel) setRate(externalParams.usdToGel.toString());
  }, [externalParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const imoClean = extractImoFromText(imo) || imo.replace(/\D/g, '').slice(0, 7);
    if (!/^\d{7}$/.test(imoClean)) {
      return;
    }
    const h = hours.trim() === '' ? CAPTAIN_DEFAULT_HOURS : Number(hours);
    const fx = rate.trim() === '' ? CAPTAIN_DEFAULT_USD_TO_GEL : Number(rate);
    const params: CalculationParams = {
      imo: imoClean,
      hours: Number.isFinite(h) && h >= 0 ? h : CAPTAIN_DEFAULT_HOURS,
      usdToGel: Number.isFinite(fx) && fx > 0 ? fx : CAPTAIN_DEFAULT_USD_TO_GEL,
      nightPilotIn,
      nightPilotOut,
      holidayTowageOut,
      holidayMooringIn,
      holidayMooringOut,
      includeCertificates,
    };
    if (reducedGrt !== '') params.reducedGrt = Number(reducedGrt);
    if (depthM !== '') params.depthM = Number(depthM);
    if (freshWaterTn !== '') params.freshWaterTn = Number(freshWaterTn);
    if (anchorageDays !== '') params.anchorageDays = Number(anchorageDays);
    if (cargoWeightTn !== '') params.cargoWeightTn = Number(cargoWeightTn);
    onCalculate(params);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Manual Control Unit</h3>
        <div className="flex-1 h-[1px] bg-primary/10" />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Anchor size={14} /> Vessel IMO Number
        </label>
        <div className="relative group">
          <input
            type="text"
            value={imo}
            onChange={(e) => setImo(e.target.value)}
            placeholder="e.g. 9341897"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-mono tracking-wider"
            required
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Clock size={14} /> Port hours
          </label>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full pl-4 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none font-bold"
            required
            min={0}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Wallet size={14} /> USD/GEL
          </label>
          <input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full pl-4 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none font-bold"
            required
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvanced(!advanced)}
        className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-primary"
      >
        Advanced (Batumi tanker model)
        {advanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {advanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reduced GRT (optional)" value={reducedGrt} onChange={setReducedGrt} placeholder="8000" />
              <Field label="Depth m (optional)" value={depthM} onChange={setDepthM} placeholder="10" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Toggle label="Night pilot in" checked={nightPilotIn} onChange={setNightPilotIn} />
              <Toggle label="Night pilot out" checked={nightPilotOut} onChange={setNightPilotOut} />
              <Toggle label="Holiday towage out" checked={holidayTowageOut} onChange={setHolidayTowageOut} />
              <Toggle label="Holiday mooring in" checked={holidayMooringIn} onChange={setHolidayMooringIn} />
              <Toggle label="Holiday mooring out" checked={holidayMooringOut} onChange={setHolidayMooringOut} />
              <Toggle label="Certificates" checked={includeCertificates} onChange={setIncludeCertificates} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fresh water (tn)" value={freshWaterTn} onChange={setFreshWaterTn} placeholder="0" />
              <Field label="Anchorage days" value={anchorageDays} onChange={setAnchorageDays} placeholder="0" />
            </div>
            <Field
              label="Cargo weight (tn, optional — uses cargoPerTnUsd from admin pricing)"
              value={cargoWeightTn}
              onChange={setCargoWeightTn}
              placeholder="0"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-5 maritime-gradient hover:opacity-90 active:scale-[0.98] transition-all rounded-xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            <span>Calculating...</span>
          </>
        ) : (
          <span>Estimate PDA</span>
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase text-slate-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      <span>{label}</span>
    </label>
  );
}
