import React, { useState, useEffect, useRef } from 'react';
import MathView from './MathView';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize, 
  Minimize, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  Flame, 
  Play, 
  Pause 
} from 'lucide-react';

interface PresentationModeProps {
  onClose: () => void;
  onNavigateModule: (module: string) => void;
}

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  formula?: string;
  points: string[];
  notes: string;
  relatedModule?: string;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ onClose, onNavigateModule }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [showNotes, setShowNotes] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);

  const slides: Slide[] = [
    {
      id: 1,
      title: "Electromagnetic Field Visualization",
      subtitle: "Using Vector Integral Theorems",
      points: [
        "Applied Mathematics & Classical Electrodynamics",
        "Rigorous connection between mathematical vector calculus and physical fields",
        "Live 3D WebGL simulations of Green's, Gauss', and Stokes' Theorems",
        "Coulomb electrostatics, Biot-Savart magnetostatics, and propagating EM radiation"
      ],
      notes: "Introduce the motivation of the project: connecting abstract mathematical surface/line integrals to physical fields like electric charges, magnetic loops, and radio waves.",
      relatedModule: "landing"
    },
    {
      id: 2,
      title: "Vector Calculus Foundations",
      subtitle: "Gradient ∇f, Divergence ∇·F, and Curl ∇×F",
      formula: "\\nabla f = \\left\\langle \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y}, \\frac{\\partial f}{\\partial z} \\right\\rangle, \\quad \\nabla \\cdot \\mathbf{F} = \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} + \\frac{\\partial R}{\\partial z}",
      points: [
        "Gradient ∇f: Vector of steepest ascent on a scalar potential landscape",
        "Divergence ∇·F: Volumetric flux density — positive sources emit particles, negative sinks absorb",
        "Curl ∇×F: Microscopic circulation density — local angular velocity of rotation ω = ½ ∇×F"
      ],
      notes: "Explain how differential operators describe local field behavior at every infinitesimal point in space.",
      relatedModule: "vector_calculus"
    },
    {
      id: 3,
      title: "Green's Theorem in the Plane",
      subtitle: "Bridging 1D Boundary Circulation and 2D Interior Curl",
      formula: "\\oint_{\\partial D} (L\\,dx + M\\,dy) = \\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA",
      points: [
        "Left-Hand Side: Counter-clockwise line integral along closed curve ∂D",
        "Right-Hand Side: Double integral of 2D curl over the enclosed disk region D",
        "Independent numerical quadrature validates identity within 0.01% error",
        "Physical manifestation: 2D fluid vortex circulation and Ampère's planar loop"
      ],
      notes: "Highlight the dual calculation: our engine integrates the boundary line and interior area completely independently and verifies their mathematical equivalence.",
      relatedModule: "greens"
    },
    {
      id: 4,
      title: "Gauss' Divergence Theorem",
      subtitle: "Total Boundary Flux Equals Net Volume Divergence",
      formula: "\\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS = \\iiint_V (\\nabla \\cdot \\mathbf{F}) \\, dV",
      points: [
        "Left-Hand Side: Outward normal surface flux through closed Gaussian surface ∂V",
        "Right-Hand Side: Volume integral of divergence throughout solid interior V",
        "Foundation of Gauss's Law: ∮ E·dA = Q_enc / ε₀",
        "Directly explains why electric field lines must originate on positive charges and terminate on negative charges"
      ],
      notes: "Demonstrate the closed sphere surface flux vs the volume voxel divergence sum.",
      relatedModule: "gauss"
    },
    {
      id: 5,
      title: "Stokes' Theorem in 3D Space",
      subtitle: "Boundary Curve Circulation and Surface Curl Flux",
      formula: "\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS",
      points: [
        "Left-Hand Side: Line integral of F along closed 1D spatial boundary loop ∂S",
        "Right-Hand Side: Surface flux of curl (∇×F) across ANY 3D open cap bounded by ∂S",
        "Foundation of Faraday's Law: ∮ E·dr = -dΦB/dt",
        "Enables transformer action, induction motors, and electric power generation"
      ],
      notes: "Point out that any surface capping the boundary loop yields identical curl flux.",
      relatedModule: "stokes"
    },
    {
      id: 6,
      title: "Maxwell's Equations & Transverse EM Waves",
      subtitle: "The Self-Propagating Cosmos",
      formula: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}, \\quad \\nabla \\times \\mathbf{B} = \\mu_0\\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}, \\quad \\mathbf{S} = \\frac{1}{\\mu_0} (\\mathbf{E} \\times \\mathbf{B})",
      points: [
        "Changing magnetic fields create electric curl; changing electric fields create magnetic curl",
        "Self-sustaining wave equation: ∇²E = (1/c²) ∂²E/∂t²",
        "Perpendicular E (Cyan) and B (Purple) fields propagate in phase along the Poynting vector S",
        "Connects vector integral calculus directly to optics, radio communications, and modern physics"
      ],
      notes: "Conclude with the unified worldview: vector integral theorems bridge the mathematical laws with the physical universe.",
      relatedModule: "emwave"
    }
  ];

  const slide = slides[currentSlide];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose]);

  // Laser pointer mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLaserActive) {
      setLaserPos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      ref={deckRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none cyber-grid text-white"
    >
      {/* Laser pointer dot */}
      {isLaserActive && (
        <div
          className="fixed pointer-events-none w-4 h-4 rounded-full bg-red-500 shadow-[0_0_15px_4px_#ef4444] z-50 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Top Presentation Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase font-semibold tracking-wider">
              Presentation Deck • Slide {currentSlide + 1} of {slides.length}
            </div>
            <div className="text-sm font-orbitron font-bold text-white">Applied Math Project</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLaserActive(!isLaserActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
              isLaserActive
                ? 'bg-red-500/30 text-red-400 border-red-500 shadow-sm shadow-red-500'
                : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Laser Pointer
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700"
          >
            <BookOpen className="w-3.5 h-3.5" /> {showNotes ? 'Hide Notes' : 'Presenter Notes'}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors"
            title="Exit Presentation (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Body */}
      <div className="max-w-5xl w-full mx-auto my-auto py-8 flex flex-col items-center text-center space-y-6">
        <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase px-3 py-1 rounded-full glass-panel border border-cyan-500/30">
          {slide.subtitle}
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold font-orbitron text-white leading-tight">
          {slide.title}
        </h1>

        {/* Math formula */}
        {slide.formula && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 max-w-3xl w-full overflow-x-auto my-2">
            <MathView math={slide.formula} block className="text-lg sm:text-2xl text-cyan-300 font-bold" />
          </div>
        )}

        {/* Key Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl w-full text-left mt-4">
          {slide.points.map((pt, idx) => (
            <div key={idx} className="glass-panel p-4 rounded-xl border-slate-800 flex items-start gap-3">
              <span className="text-cyan-400 font-bold text-base">›</span>
              <p className="text-sm text-slate-200 leading-relaxed">{pt}</p>
            </div>
          ))}
        </div>

        {/* Jump to Interactive Simulation button */}
        {slide.relatedModule && (
          <button
            onClick={() => {
              onClose();
              onNavigateModule(slide.relatedModule!);
            }}
            className="btn-cyan px-5 py-2.5 rounded-xl font-orbitron text-xs font-semibold flex items-center gap-2 cursor-pointer mt-4"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Open Live 3D Simulation for this Slide
          </button>
        )}

        {/* Presenter Notes Box */}
        {showNotes && (
          <div className="max-w-3xl w-full text-left p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono">
            <strong className="block text-amber-400 uppercase mb-1">Speaker's Script / Talking Points:</strong>
            {slide.notes}
          </div>
        )}
      </div>

      {/* Bottom Timeline & Navigation Toolbar */}
      <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4">
        <button
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
          className="px-4 py-2 rounded-lg glass-panel text-xs font-orbitron font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:border-cyan-400"
        >
          <ChevronLeft className="w-4 h-4" /> Previous Slide
        </button>

        {/* Dot timeline indicators */}
        <div className="flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                currentSlide === idx ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          disabled={currentSlide === slides.length - 1}
          onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
          className="btn-cyan px-4 py-2 rounded-lg text-xs font-orbitron font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          Next Slide <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PresentationMode;
