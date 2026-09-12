import React, { useState } from 'react';
import {
  Calculator,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { CommissionBar } from '../../components/work/CommissionBar';
import { formatINR } from '../../utils/formatters';

export const AdminCommissions: React.FC = () => {
  const [simBudget, setSimBudget] = useState(500000);
  const [simDiscount, setSimDiscount] = useState(5);

  // Simulation values
  const [simSplits, setSimSplits] = useState({
    broker: 10,
    employee: 40,
    officeExpense: 20,
    adminShare: 25,
    settlementReserve: 5,
  });

  // Calculations for simulated cash allocations
  const simDiscAmt = (simBudget * simDiscount) / 100;
  const simNetBudget = Math.max(0, simBudget - simDiscAmt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Commission</h1>
          <p className="text-xs text-zinc-400 mt-1">5-Tier revenue distribution rules and profit margin simulator.</p>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="bg-[#08090d] border border-white/[0.06] rounded-2xl p-5 md:p-6 space-y-5">
        {/* Simulator Header & Budget Controller */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#FF5A1F] shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Deal Simulator & Cascaded Discount Engine</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simulate exact ₹ cash allocations and observe how client discounts protect studio margins.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-400">Budget:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">₹</span>
              <input
                type="number"
                value={simBudget}
                onChange={(e) => setSimBudget(Number(e.target.value))}
                className="w-32 pl-6 pr-2.5 py-1.5 bg-[#0d0e14] border border-white/[0.08] rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-white/20"
              />
            </div>
          </div>
        </div>

        {/* Client Discount Slider Bar */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-ember" />
                Simulated Client Discount:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white font-mono font-bold text-xs">
                {simDiscount}%
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-zinc-500">
                Gross: <span className="text-zinc-300">{formatINR(simBudget)}</span>
              </span>
              <span className="text-zinc-400">
                Discount: -{formatINR(simDiscAmt)}
              </span>
              <span className="text-zinc-500">
                Net Settled: <span className="text-white font-bold">{formatINR(simNetBudget)}</span>
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={simDiscount}
            onChange={(e) => setSimDiscount(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF5A1F]"
          />

          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
            <span>0% (Full Price)</span>
            <span>5% Standard</span>
            <span>15% Agency</span>
            <span>30% Maximum Cap</span>
          </div>
        </div>

        {/* Proportional Segmented Split Bar */}
        <div className="pt-1">
          <CommissionBar
            broker={simSplits.broker}
            employee={simSplits.employee}
            officeExpense={simSplits.officeExpense}
            adminShare={simSplits.adminShare}
            settlementReserve={simSplits.settlementReserve}
            totalAmount={simNetBudget}
            showLegend={false}
            size="md"
          />
        </div>

        {/* 5 Interactive Allocation Tiers (Clean, Minimal, Non-Redundant) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {[
            { key: 'broker', label: 'Broker Fee', dotColor: 'bg-zinc-400', sliderClass: 'accent-zinc-400' },
            { key: 'employee', label: 'Employee Pool', dotColor: 'bg-[#FF5A1F]', sliderClass: 'accent-[#FF5A1F]' },
            { key: 'officeExpense', label: 'Office & Debt', dotColor: 'bg-zinc-300', sliderClass: 'accent-zinc-300' },
            { key: 'adminShare', label: 'Admin Share', dotColor: 'bg-white', sliderClass: 'accent-white' },
            { key: 'settlementReserve', label: 'Settlement Reserve', dotColor: 'bg-zinc-500', sliderClass: 'accent-zinc-500' },
          ].map((field) => {
            const splitPct = (simSplits as any)[field.key];
            const netAmount = (simNetBudget * splitPct) / 100;
            const grossAmount = (simBudget * splitPct) / 100;
            const variance = grossAmount - netAmount;

            return (
              <div
                key={field.key}
                className="p-3.5 rounded-xl bg-[#0c0d12] border border-white/[0.05] space-y-2.5 hover:border-white/10 transition-colors"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full ${field.dotColor} shrink-0`} />
                    <span className="text-zinc-300 font-medium text-xs truncate">{field.label}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-xs">{splitPct}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={splitPct}
                  onChange={(e) =>
                    setSimSplits({ ...simSplits, [field.key]: Number(e.target.value) })
                  }
                  className={`w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer ${field.sliderClass}`}
                />

                <div className="pt-1.5 border-t border-white/[0.05] space-y-0.5">
                  <div className="text-xs font-mono font-bold text-white text-right">
                    {formatINR(netAmount)}
                  </div>
                  {simDiscount > 0 && (
                    <div className="text-[10px] font-mono text-zinc-400 text-right">
                      -{formatINR(variance)} ({simDiscount}%)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle Protection Rule Notice */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04] text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-ember shrink-0" />
          <span>
            <strong className="text-zinc-400 font-medium">Protection Rule:</strong> When a discount of {simDiscount}% is granted, staff pool and studio reserves scale proportionally so the agency stays profitable.
          </span>
        </div>
      </div>

    </div>
  );
};
