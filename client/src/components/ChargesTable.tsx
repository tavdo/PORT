'use client';

import { Fragment } from 'react';
import { ChargeSection } from '@/lib/api';
import { motion } from 'framer-motion';

interface ChargesTableProps {
  sections: ChargeSection[];
}

export default function ChargesTable({ sections }: ChargesTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-lg text-navy dark:text-white">Breakdown of Charges</h3>
        <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded-full uppercase">
          Currency: USD
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Amount (USD)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sections.map((sec) => (
              <Fragment key={sec.id}>
                <tr>
                  <td colSpan={2} className="px-6 py-2 text-xs font-black text-primary uppercase bg-primary/5">
                    {sec.title}
                  </td>
                </tr>
                {sec.items.map((item) => (
                  <tr
                    key={`${sec.id}-${item.key}`}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                      {item.calculationMethod ? (
                        <span className="block text-xs text-slate-400 mt-1 font-normal">{item.calculationMethod}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-navy dark:text-white text-right font-mono">
                      ${item.amountUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
