import React from 'react';
import { TrendingUp, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { MathView } from './MathView';

export interface ResultEntry {
  label: string;
  value: number | string;
  unit?: string;
  formula?: string;          // optional LaTeX formula
  highlight?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'red' | 'blue';
}

interface ResultsPanelProps {
  title: string;
  lawName: string;
  results: ResultEntry[];
  verified?: boolean;
  verifiedLabel?: string;
}

const highlightColors = {
  cyan:    { bg: 'bg-cyan-950/40',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    dot: 'bg-cyan-400' },
  purple:  { bg: 'bg-purple-950/40',  border: 'border-purple-500/30',  text: 'text-purple-300',  dot: 'bg-purple-400' },
  emerald: { bg: 'bg-emerald-950/40', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  amber:   { bg: 'bg-amber-950/40',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  red:     { bg: 'bg-red-950/40',     border: 'border-red-500/30',     text: 'text-red-300',     dot: 'bg-red-400' },
  blue:    { bg: 'bg-blue-950/40',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-400' },
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  title,
  lawName,
  results,
  verified,
  verifiedLabel,
}) => {
  return (
    <div className="glass-panel-elevated rounded-xl border border-emerald-500/25 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-950/30 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-orbitron">{title}</h3>
            <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-wide">{lawName}</p>
          </div>
        </div>
        {verified !== undefined && (
          <span
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-mono font-bold uppercase tracking-wider ${
              verified
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {verified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {verifiedLabel ?? (verified ? 'VERIFIED' : 'COMPUTING')}
          </span>
        )}
      </div>

      {/* Live Values Grid */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3">
          <Activity className="w-3 h-3" />
          <span>Live Computed Values</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {results.map((r, idx) => {
            const colorKey = r.highlight ?? 'cyan';
            const col = highlightColors[colorKey];
            const displayVal = typeof r.value === 'number'
              ? (Math.abs(r.value) >= 1000 || (Math.abs(r.value) < 0.001 && r.value !== 0))
                ? r.value.toExponential(4)
                : r.value.toFixed(4)
              : r.value;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${col.bg} ${col.border} transition-all duration-200`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-mono truncate">{r.label}</div>
                    {r.formula && (
                      <div className="text-[10px] text-slate-500 mt-0.5 overflow-x-auto">
                        <MathView math={r.formula} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                  <span className={`text-base font-mono font-bold ${col.text}`}>
                    {displayVal}
                  </span>
                  {r.unit && (
                    <span className="text-[10px] text-slate-400 font-mono">{r.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
