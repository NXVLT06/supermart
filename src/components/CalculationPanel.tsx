import React, { useState } from 'react';
import { MathView } from './MathView';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Calculator, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CalculationPanelProps {
  title: string;
  formulaLatex: string;
  inputs: Array<{ label: string; value: string | number; unit?: string }>;
  steps: string[];
  lhsName?: string;
  lhsValue?: number;
  rhsName?: string;
  rhsValue?: number;
  difference?: number;
  relativeErrorPercent?: number;
  isVerified?: boolean;
  resultLatex?: string;
  physicalMeaning?: string;
  mode?: 'beginner' | 'learning' | 'advanced';
}

export const CalculationPanel: React.FC<CalculationPanelProps> = ({
  title,
  formulaLatex,
  inputs,
  steps,
  lhsName,
  lhsValue,
  rhsName,
  rhsValue,
  difference,
  relativeErrorPercent,
  isVerified,
  resultLatex,
  physicalMeaning,
  mode = 'learning'
}) => {
  const [expanded, setExpanded] = useState(true);

  const triggerVerificationConfetti = () => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#00f0ff', '#a855f7', '#10b981']
    });
  };

  return (
    <div className="glass-panel-elevated rounded-xl p-4 border border-cyan-500/30 text-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none border-b border-cyan-500/20 pb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-orbitron flex items-center gap-2">
              {title}
              {isVerified !== undefined && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isVerified) triggerVerificationConfetti();
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isVerified
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {isVerified ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Theorem Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Calculating...
                    </>
                  )}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Step-by-step mathematical derivation</p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-cyan-300 p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3.5 space-y-4">
          {/* Main Formula in KaTeX */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-cyan-500/20 text-center overflow-x-auto">
            <div className="text-[10px] text-cyan-400 font-mono uppercase mb-1 tracking-wider">Governing Equation</div>
            <MathView math={formulaLatex} block className="text-cyan-200" />
          </div>

          {/* Inputs Grid */}
          {inputs.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                <span>[1] Input Parameters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {inputs.map((inp, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-xs">
                    <span className="text-slate-400 block text-[10px]">{inp.label}</span>
                    <span className="font-mono text-cyan-300 font-semibold">
                      {inp.value} {inp.unit || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theorem Verification Side-by-Side Comparison if provided */}
          {lhsValue !== undefined && rhsValue !== undefined && (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/30">
              <div className="text-[11px] font-mono uppercase text-purple-400 mb-2 flex items-center justify-between">
                <span>[2] Independent Theorem Verification</span>
                <span className="text-[10px] text-slate-400 font-mono">Tolerance: ±5.0%</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-[10px] text-cyan-400 font-mono mb-1 truncate">{lhsName || 'LHS (Boundary)'}</div>
                  <div className="text-lg font-mono font-bold text-white">{lhsValue.toFixed(4)}</div>
                </div>
                <div className="p-2.5 rounded bg-purple-950/40 border border-purple-500/30">
                  <div className="text-[10px] text-purple-400 font-mono mb-1 truncate">{rhsName || 'RHS (Interior)'}</div>
                  <div className="text-lg font-mono font-bold text-white">{rhsValue.toFixed(4)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-300 border-t border-slate-800">
                <span>Difference |LHS - RHS|: <strong className="text-cyan-300">{difference !== undefined ? difference.toFixed(5) : Math.abs(lhsValue - rhsValue).toFixed(5)}</strong></span>
                <span>Rel. Error: <strong className={relativeErrorPercent !== undefined && relativeErrorPercent <= 5 ? 'text-emerald-400' : 'text-amber-400'}>{relativeErrorPercent !== undefined ? relativeErrorPercent.toFixed(3) : '0.000'}%</strong></span>
              </div>
            </div>
          )}

          {/* Step-by-Step Calculation Steps */}
          {steps.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                <span>[{lhsValue !== undefined ? '3' : '2'}] Step-by-Step Execution</span>
              </div>
              <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
                {steps.map((st, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5">
                    <span className="text-cyan-400 font-bold">›</span>
                    <span className="leading-relaxed">
                      {st.includes('\\') ? <MathView math={st} /> : st}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Result / Conclusion */}
          {resultLatex && (
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">Final Evaluated Result</span>
              <MathView math={resultLatex} className="text-emerald-300 font-bold" />
            </div>
          )}

          {/* Physical Meaning / Educational Intuition */}
          {physicalMeaning && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-blue-300 font-semibold block text-[11px] uppercase tracking-wide font-mono mb-0.5">
                  Physical & Applied Math Intuition
                </span>
                <p className="leading-relaxed">{physicalMeaning}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalculationPanel;
