'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Mic, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCaptainCommand, mergeCaptainParams, extractImoFromText } from '@/lib/commandParser';
import type { CalculationParams } from '@/lib/api';
import { CAPTAIN_DEFAULT_HOURS, CAPTAIN_DEFAULT_USD_TO_GEL } from '@/lib/api';

interface CaptainCommandBarProps {
  onExecute: (params: CalculationParams) => void;
  syncParams: (params: Partial<CalculationParams>) => void;
}

export default function CaptainCommandBar({ onExecute, syncParams }: CaptainCommandBarProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const merged = useMemo(() => {
    const parsed = parseCaptainCommand(input);
    return mergeCaptainParams(parsed);
  }, [input]);

  useEffect(() => {
    syncParams(merged ?? (extractImoFromText(input) ? { imo: extractImoFromText(input)! } : {}));
  }, [input, merged, syncParams]);

  const run = () => {
    if (!merged) return;
    onExecute(merged);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && merged) {
      e.preventDefault();
      run();
    }
  };

  const startListening = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Record<string, unknown>;
      webkitSpeechRecognition?: new () => Record<string, unknown>;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SR() as {
      lang: string;
      start: () => void;
      onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
    };
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <p className="text-center text-sm text-slate-600 dark:text-slate-400 mb-3">
        Paste any line from your papers — we find the IMO. One tap to calculate.
      </p>
      <div
        className={`relative transition-all duration-500 rounded-3xl overflow-hidden shadow-2xl ${
          isFocused ? 'ring-4 ring-primary/20 scale-[1.01]' : ''
        }`}
      >
        <div className="absolute inset-0 bg-navy dark:bg-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

        <div className="relative flex items-center p-2">
          <div className="p-4 text-primary">
            <Terminal size={24} className={isFocused ? 'animate-pulse' : ''} />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="IMO only: 9341897 — or paste: 'Vessel IMO 9341897 / 150h / 2.74'"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg py-4 placeholder:text-slate-500 font-mono tracking-wide"
            autoComplete="off"
            autoFocus
          />

          <div className="flex items-center gap-2 pr-4">
            <button
              type="button"
              onClick={startListening}
              className="p-3 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90"
              title="Speak IMO or command"
            >
              <Mic size={20} />
            </button>
            <button
              type="button"
              disabled={!merged}
              onClick={run}
              className={`p-3 rounded-2xl transition-all ${
                merged ? 'bg-primary text-white scale-100 hover:opacity-90' : 'bg-white/10 text-slate-600 scale-90'
              }`}
              title="Calculate PDA"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {input.trim() && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5 bg-black/20 px-6 py-3 flex flex-wrap gap-4 items-center"
            >
              <StatusChip label="IMO" value={merged?.imo} />
              <StatusChip label="Hours" value={merged ? String(merged.hours) : String(CAPTAIN_DEFAULT_HOURS)} dim={!merged} />
              <StatusChip label="USD/GEL" value={merged ? String(merged.usdToGel) : String(CAPTAIN_DEFAULT_USD_TO_GEL)} dim={!merged} />

              <div className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                {merged ? (
                  <>
                    <CheckCircle2 size={12} className="text-green-500" />
                    Press Enter or tap send
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="text-amber-500" />
                    Need a valid 7-digit IMO
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        <span>Defaults: {CAPTAIN_DEFAULT_HOURS}h · {CAPTAIN_DEFAULT_USD_TO_GEL} GEL/USD</span>
      </div>
    </div>
  );
}

function StatusChip({
  label,
  value,
  dim,
}: {
  label: string;
  value?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs transition-all border ${
        value && !dim
          ? 'bg-primary/20 text-primary border-primary/30'
          : 'bg-white/5 text-slate-600 border-white/5'
      }`}
    >
      <span className="font-bold opacity-50">{label}:</span>
      <span className="font-mono">{value || '—'}</span>
    </div>
  );
}
