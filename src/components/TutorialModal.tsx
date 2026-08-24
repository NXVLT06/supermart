import React, { useState } from 'react';
import { Sparkles, X, ChevronRight, ChevronLeft, Check, Compass, Eye, ShieldCheck, Zap } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Welcome to the Vector Calculus & EM Laboratory",
      description: "This application demonstrates the profound link between vector integral theorems (Green's, Gauss', Stokes') and electromagnetic field behavior using interactive 3D WebGL physics and rigorous mathematical derivations.",
      icon: Sparkles,
      color: "text-cyan-400"
    },
    {
      title: "3D Camera & Viewport Navigation",
      description: "Click and drag to rotate the camera in 3D. Right-click or hold Shift while dragging to pan. Use your mouse scroll wheel (or pinch on touchscreens) to zoom. Use the quick toolbar (ISO, TOP, FRONT, SIDE) to jump directly into standard planes.",
      icon: Compass,
      color: "text-purple-400"
    },
    {
      title: "Vector Fields & Parameter Sliders",
      description: "Experiment with radial sources, rotational vortices, hyperbolic saddles, or type your own custom mathematical equations F(x,y,z) = (P, Q, R). Adjust vector density, particle flow speed, and field strengths in real-time.",
      icon: Eye,
      color: "text-emerald-400"
    },
    {
      title: "Independent Theorem Verification Engine",
      description: "Every theorem module independently integrates both sides of the equation (Boundary Line/Surface vs Interior Area/Volume) using high-precision numerical quadrature, comparing discrepancies against tight tolerances to award the 'Theorem Verified' status.",
      icon: ShieldCheck,
      color: "text-amber-400"
    },
    {
      title: "Electromagnetic Physics Simulators",
      description: "Add and drag Coulomb point charges to watch RK4 field lines reshape, toggle current flow to test Ampère's circuital law, and explore propagating transverse EM waves with orthogonal E and B oscillations carrying Poynting energy flux.",
      icon: Zap,
      color: "text-blue-400"
    }
  ];

  const current = steps[step];
  const Icon = current.icon;

  const handleFinish = () => {
    localStorage.setItem('em_lab_tutorial_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel-elevated max-w-lg w-full rounded-2xl p-6 border-cyan-500/40 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleFinish}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${current.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Lab Guide • Step {step + 1} of {steps.length}
            </div>
            <h3 className="text-base font-orbitron font-bold text-white">{current.title}</h3>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          {current.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  step === i ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="btn-cyan px-4 py-1.5 rounded-lg text-xs font-orbitron font-semibold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="btn-cyan px-4 py-1.5 rounded-lg text-xs font-orbitron font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Start Exploring
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
