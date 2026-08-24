import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Play, 
  BookOpen, 
  Presentation, 
  Sparkles, 
  Compass, 
  Maximize, 
  Layers, 
  Zap, 
  Radio, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Waves
} from 'lucide-react';
import MathView from '../components/MathView';

interface LandingPageProps {
  onNavigate: (module: string) => void;
  onStartPresentation: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onStartPresentation }) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current.innerHTML = '';
    canvasRef.current.appendChild(renderer.domElement);

    // Dynamic Wave Ribbons & Particle Swarm
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      const u = (Math.random() - 0.5) * 16;
      const v = (Math.random() - 0.5) * 8;
      const w = (Math.random() - 0.5) * 12;
      posArray[i * 3] = u;
      posArray[i * 3 + 1] = v;
      posArray[i * 3 + 2] = w;

      const isCyan = Math.random() > 0.5;
      colorArray[i * 3] = isCyan ? 0.0 : 0.65;
      colorArray[i * 3 + 1] = isCyan ? 0.94 : 0.33;
      colorArray[i * 3 + 2] = 1.0;
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Glowing EM wave curve
    const wavePointsCount = 200;
    const waveGeom = new THREE.BufferGeometry();
    const wavePos = new Float32Array(wavePointsCount * 3);
    waveGeom.setAttribute('position', new THREE.BufferAttribute(wavePos, 3));
    const waveMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2, transparent: true, opacity: 0.75 });
    const waveLine = new THREE.Line(waveGeom, waveMat);
    scene.add(waveLine);

    // Orthogonal B wave curve
    const waveBGeom = new THREE.BufferGeometry();
    const waveBPos = new Float32Array(wavePointsCount * 3);
    waveBGeom.setAttribute('position', new THREE.BufferAttribute(waveBPos, 3));
    const waveBMat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 2, transparent: true, opacity: 0.75 });
    const waveBLine = new THREE.Line(waveBGeom, waveBMat);
    scene.add(waveBLine);

    let animId = 0;
    let time = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.015;

      // Particle rotation & oscillation
      particles.rotation.y = time * 0.1;
      particles.rotation.x = Math.sin(time * 0.2) * 0.05;

      // Wave updating
      const posAttr = waveGeom.attributes.position as THREE.BufferAttribute;
      const posBAttr = waveBGeom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < wavePointsCount; i++) {
        const x = ((i / wavePointsCount) - 0.5) * 14;
        const phase = x * 1.5 - time * 4;
        const ey = Math.sin(phase) * 1.5;
        const bz = Math.sin(phase) * 1.5;

        posAttr.setXYZ(i, x, ey, 0);
        posBAttr.setXYZ(i, x, 0, bz);
      }
      posAttr.needsUpdate = true;
      posBAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  const featureCards = [
    {
      id: 'greens',
      title: "Green's Theorem",
      formula: "\\oint_{\\partial D} (L\\,dx + M\\,dy) = \\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA",
      description: "Bridges 2D boundary line circulation with interior curl area integral.",
      badge: '2D Circulation & Curl',
      color: 'from-cyan-500/20 to-blue-600/20',
      borderColor: 'border-cyan-500/40'
    },
    {
      id: 'gauss',
      title: "Gauss' Divergence Theorem",
      formula: "\\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS = \\iiint_V (\\nabla \\cdot \\mathbf{F}) \\, dV",
      description: "Connects outward surface flux to internal volume source divergence.",
      badge: '3D Flux & Sources',
      color: 'from-purple-500/20 to-pink-600/20',
      borderColor: 'border-purple-500/40'
    },
    {
      id: 'stokes',
      title: "Stokes' Theorem",
      formula: "\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS",
      description: "Translates 3D boundary curve work into surface curl flux integration.",
      badge: '3D Circulation & Vorticity',
      color: 'from-emerald-500/20 to-cyan-600/20',
      borderColor: 'border-emerald-500/40'
    },
    {
      id: 'electric',
      title: "Electric Field & Gauss' Law",
      formula: "\\Phi_E = \\oiint \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{\\text{enclosed}}}{\\varepsilon_0}",
      description: "Dynamic Coulomb field lines, charges, equipotential contours, and Gaussian surfaces.",
      badge: 'Electrostatics',
      color: 'from-amber-500/20 to-orange-600/20',
      borderColor: 'border-amber-500/40'
    },
    {
      id: 'magnetic',
      title: "Magnetic Field & Ampère's Law",
      formula: "\\oint \\mathbf{B} \\cdot d\\mathbf{r} = \\mu_0 I_{\\text{enc}}",
      description: "Biot-Savart field loops around current wires, right-hand rule, and current reversal.",
      badge: 'Magnetostatics',
      color: 'from-blue-500/20 to-indigo-600/20',
      borderColor: 'border-blue-500/40'
    },
    {
      id: 'emwave',
      title: "Electromagnetic Waves",
      formula: "\\mathbf{S} = \\frac{1}{\\mu_0} (\\mathbf{E} \\times \\mathbf{B})",
      description: "Orthogonal transverse oscillating fields carrying energy flux through spacetime.",
      badge: 'Electrodynamics',
      color: 'from-fuchsia-500/20 to-purple-600/20',
      borderColor: 'border-fuchsia-500/40'
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden cyber-grid">
      {/* 3D Background Canvas */}
      <div ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-60 z-0" />
      <div className="scanline" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Futuristic Project Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-cyan-500/40 mb-6 animate-pulse-glow">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono tracking-widest text-cyan-300 uppercase">
            Applied Mathematics & Electromagnetism Laboratory
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold font-orbitron tracking-tight mb-6 bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
          Electromagnetic Field Visualization
        </h1>

        <div className="text-xl sm:text-2xl font-orbitron text-cyan-400 font-semibold mb-4 tracking-wide">
          Using Vector Integral Theorems
        </div>

        {/* Subtitle */}
        <p className="max-w-3xl text-base sm:text-lg text-slate-300 mb-10 leading-relaxed">
          An interactive, mathematically rigorous 3D simulation environment connecting 
          <span className="text-cyan-300 font-semibold"> Green’s, Gauss’ and Stokes’ Theorems </span>
          with fundamental electromagnetic field behavior — from Coulomb charges and Biot-Savart loops to propagating EM waves.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            onClick={() => onNavigate('field_explorer')}
            className="btn-cyan px-6 py-3.5 rounded-xl font-orbitron font-semibold text-sm flex items-center gap-2.5 group cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
            Start Visualization
          </button>

          <button
            onClick={() => onNavigate('vector_calculus')}
            className="btn-purple px-6 py-3.5 rounded-xl font-orbitron font-semibold text-sm flex items-center gap-2.5 group cursor-pointer"
          >
            <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Learn Mathematics
          </button>

          <button
            onClick={onStartPresentation}
            className="px-6 py-3.5 rounded-xl glass-panel font-orbitron font-semibold text-sm text-slate-200 hover:text-white border-slate-700 hover:border-cyan-400 flex items-center gap-2.5 transition-all hover:bg-slate-800/80 cursor-pointer"
          >
            <Presentation className="w-4 h-4 text-cyan-400" />
            Presentation Mode
          </button>
        </div>

        {/* Key Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-20">
          <div className="glass-panel p-4 rounded-xl border-cyan-500/20 text-center">
            <div className="text-2xl sm:text-3xl font-orbitron font-bold text-cyan-400 mb-1">11+</div>
            <div className="text-xs font-mono text-slate-400 uppercase">Interactive Labs</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border-purple-500/20 text-center">
            <div className="text-2xl sm:text-3xl font-orbitron font-bold text-purple-400 mb-1">3</div>
            <div className="text-xs font-mono text-slate-400 uppercase">Integral Theorems</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border-emerald-500/20 text-center">
            <div className="text-2xl sm:text-3xl font-orbitron font-bold text-emerald-400 mb-1">100%</div>
            <div className="text-xs font-mono text-slate-400 uppercase">Analytic Rigor</div>
          </div>
          <div className="glass-panel p-4 rounded-xl border-blue-500/20 text-center">
            <div className="text-2xl sm:text-3xl font-orbitron font-bold text-blue-400 mb-1">60 FPS</div>
            <div className="text-xs font-mono text-slate-400 uppercase">WebGL Physics</div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="w-full text-left mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-orbitron font-bold text-white flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Core Mathematical & Physical Modules
            </h2>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">SELECT A SIMULATION TO LAUNCH</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureCards.map((card) => (
              <div
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className={`group glass-panel rounded-xl p-5 border ${card.borderColor} hover:border-cyan-400 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/80 text-cyan-300 border border-slate-700">
                      {card.badge}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="text-lg font-orbitron font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>

                  <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 my-2 overflow-x-auto">
                    <MathView math={card.formula} block className="text-xs text-cyan-200" />
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {card.description}
                  </p>
                </div>

                <div className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1 group-hover:underline">
                  Launch Visualizer <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
