import React from 'react';
import MathView from '../components/MathView';
import { 
  Table, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  BookOpen, 
  Zap, 
  Compass, 
  Cpu, 
  ArrowRight 
} from 'lucide-react';

interface TheoremComparisonViewProps {
  onNavigate: (module: string) => void;
}

export const TheoremComparisonView: React.FC<TheoremComparisonViewProps> = ({ onNavigate }) => {
  const theoremMatrix = [
    {
      name: "Green's Theorem",
      id: "greens",
      dimension: "2D Plane (Region D ⊂ ℝ²)",
      integralType: "Boundary Line Integral ↔ Area Double Integral",
      equation: "\\oint_{\\partial D} (L\\,dx + M\\,dy) = \\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA",
      boundaryOperator: "\\partial D \\text{ (1D closed curve)}",
      differentialForm: "\\int_{\\partial D} \\omega = \\int_D d\\omega \\quad (\\omega = L\\,dx + M\\,dy)",
      physicalInterpretation: "Macro circulation around a 2D perimeter equals total rotational curl density in interior.",
      maxwellLink: "2D planar case of Ampère's Law & 2D fluid circulation",
      accent: "cyan"
    },
    {
      name: "Stokes' Theorem",
      id: "stokes",
      dimension: "3D Space (Curved Surface S ⊂ ℝ³)",
      integralType: "Boundary Curve Line Integral ↔ Surface Curl Flux",
      equation: "\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS",
      boundaryOperator: "\\partial S \\text{ (1D closed loop)}",
      differentialForm: "\\int_{\\partial S} \\omega = \\int_S d\\omega \\quad (\\omega = F_1 dx + F_2 dy + F_3 dz)",
      physicalInterpretation: "Circulation of force/velocity along boundary loop equals flux of curl through capped surface.",
      maxwellLink: "Faraday's Law of Induction & Ampère-Maxwell Law",
      accent: "purple"
    },
    {
      name: "Gauss' Divergence Theorem",
      id: "gauss",
      dimension: "3D Space (Solid Volume V ⊂ ℝ³)",
      integralType: "Closed Surface Flux ↔ Volume Divergence Integral",
      equation: "\\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS = \\iiint_V (\\nabla \\cdot \\mathbf{F}) \\, dV",
      boundaryOperator: "\\partial V \\text{ (2D closed boundary surface)}",
      differentialForm: "\\int_{\\partial V} \\omega = \\int_V d\\omega \\quad (\\omega = \\text{2-form flux})",
      physicalInterpretation: "Total outward vector flux escaping closed boundary equals net source/sink divergence inside.",
      maxwellLink: "Gauss's Law for Electricity (∇·E = ρ/ε₀) & Magnetism (∇·B = 0)",
      accent: "emerald"
    }
  ];

  const maxwellTable = [
    {
      name: "Gauss's Law (Electric)",
      integral: "\\oiint_{\\partial V} \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{\\text{enc}}}{\\varepsilon_0}",
      differential: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}",
      theoremUsed: "Gauss' Divergence Theorem",
      physics: "Electric charges act as sources (positive) and sinks (negative) of electric field lines."
    },
    {
      name: "Gauss's Law for Magnetism",
      integral: "\\oiint_{\\partial V} \\mathbf{B} \\cdot d\\mathbf{A} = 0",
      differential: "\\nabla \\cdot \\mathbf{B} = 0",
      theoremUsed: "Gauss' Divergence Theorem",
      physics: "No magnetic monopoles exist; magnetic field lines always form continuous closed loops."
    },
    {
      name: "Faraday's Law of Induction",
      integral: "\\oint_{\\partial S} \\mathbf{E} \\cdot d\\mathbf{r} = -\\frac{d\\Phi_B}{dt}",
      differential: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
      theoremUsed: "Stokes' Theorem",
      physics: "A time-varying magnetic field induces a circulating non-conservative electric field (EMF)."
    },
    {
      name: "Ampère-Maxwell Law",
      integral: "\\oint_{\\partial S} \\mathbf{B} \\cdot d\\mathbf{r} = \\mu_0 I_{\\text{enc}} + \\mu_0\\varepsilon_0 \\frac{d\\Phi_E}{dt}",
      differential: "\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0\\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}",
      theoremUsed: "Stokes' Theorem",
      physics: "Electric currents and changing electric displacement fields generate circulating magnetic fields."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border-cyan-500/30 text-xs font-mono text-cyan-300">
          <Sparkles className="w-3.5 h-3.5" /> Unified Differential Forms Matrix
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
          Vector Integral Theorems & Maxwell's Equations
        </h1>
        <p className="text-sm text-slate-300">
          A rigorous mathematical and physical comparison showing how Green’s, Gauss’, and Stokes’ Theorems
          are manifestations of the single <strong className="text-cyan-300">Generalized Stokes' Theorem</strong> and form the foundation of classical electromagnetism.
        </p>
      </div>

      {/* Generalized Stokes Banner */}
      <div className="glass-panel-elevated p-6 rounded-2xl border-cyan-500/40 text-center relative overflow-hidden">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2 font-bold">
          The Master Equation of Vector Calculus (Differential Forms)
        </div>
        <div className="my-3 py-2 px-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 inline-block overflow-x-auto">
          <MathView math="\int_{\partial \Omega} \omega = \int_{\Omega} d\omega" block className="text-2xl text-cyan-300 font-bold" />
        </div>
        <p className="text-xs text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The integral of a differential form <MathView math="\omega" /> over the boundary <MathView math="\partial \Omega" /> of some manifold <MathView math="\Omega" /> is equal to the integral of its exterior derivative <MathView math="d\omega" /> over the entire manifold.
        </p>
      </div>

      {/* Comparative Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {theoremMatrix.map((t) => (
          <div
            key={t.id}
            className="glass-panel rounded-2xl p-5 border border-slate-700/60 hover:border-cyan-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-orbitron font-bold text-cyan-400 uppercase tracking-wider">{t.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {t.dimension}
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 my-3 overflow-x-auto">
                <MathView math={t.equation} block className="text-xs text-cyan-200" />
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">INTEGRAL TYPE:</span>
                  <span className="text-slate-200">{t.integralType}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">BOUNDARY OPERATOR ∂:</span>
                  <MathView math={t.boundaryOperator} className="text-purple-300" />
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">DIFFERENTIAL FORM:</span>
                  <MathView math={t.differentialForm} className="text-emerald-300" />
                </div>

                <div className="pt-1 border-t border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PHYSICAL MEANING:</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed font-sans mt-0.5">{t.physicalInterpretation}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate(t.id)}
              className="mt-5 w-full py-2 px-3 rounded-lg btn-cyan text-xs font-orbitron font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Launch {t.name} Simulation <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Maxwell's Equations Integration Table */}
      <div className="glass-panel rounded-2xl p-6 border-cyan-500/20 space-y-4">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-orbitron font-bold text-white">
            Maxwell's Equations: Integral vs Differential Form
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-cyan-500/30 text-cyan-300">
                <th className="py-3 px-4 uppercase">Law Name</th>
                <th className="py-3 px-4 uppercase">Integral Formulation</th>
                <th className="py-3 px-4 uppercase">Differential Formulation</th>
                <th className="py-3 px-4 uppercase">Theorem Used</th>
                <th className="py-3 px-4 uppercase font-sans">Physical Intuition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {maxwellTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white font-orbitron">{row.name}</td>
                  <td className="py-3.5 px-4"><MathView math={row.integral} className="text-cyan-200" /></td>
                  <td className="py-3.5 px-4"><MathView math={row.differential} className="text-purple-300 font-bold" /></td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{row.theoremUsed}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-sans leading-relaxed text-[11px] max-w-xs">{row.physics}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TheoremComparisonView;
