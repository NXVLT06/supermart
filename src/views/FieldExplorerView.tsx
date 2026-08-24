import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { 
  VectorFieldFn, 
  parseCustomField, 
  computeDivergence, 
  computeCurl,
  vNorm 
} from '../utils/mathEngine';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Eye, 
  Sparkles, 
  Settings2, 
  Layers, 
  Compass, 
  Variable 
} from 'lucide-react';

export type FieldPreset = 
  | 'uniform' 
  | 'radial_source' 
  | 'radial_sink' 
  | 'rotational' 
  | 'converging' 
  | 'diverging' 
  | 'saddle' 
  | 'dipole' 
  | 'custom';

export const FieldExplorerView: React.FC = () => {
  const [preset, setPreset] = useState<FieldPreset>('radial_source');
  const [customP, setCustomP] = useState('-y');
  const [customQ, setCustomQ] = useState('x');
  const [customR, setCustomR] = useState('0.5 * z');

  // Sliders & Controls
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [vectorDensity, setVectorDensity] = useState(6); // grid per axis
  const [particleCount, setParticleCount] = useState(400);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [showVectors, setShowVectors] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Scene references for updates
  const vectorsGroupRef = useRef<THREE.Group | null>(null);
  const particlesGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const particlePositionsRef = useRef<Float32Array | null>(null);
  const particleVelocitiesRef = useRef<Float32Array | null>(null);

  // Field Function Definition
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (preset) {
      case 'uniform':
        return (x, y, z) => ({ x: fieldStrength * 1.5, y: 0, z: 0 });
      case 'radial_source':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.2;
          const f = (fieldStrength * 2.0) / Math.pow(rSq, 1.2);
          return { x: f * x, y: f * y, z: f * z };
        };
      case 'radial_sink':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.2;
          const f = (-fieldStrength * 2.0) / Math.pow(rSq, 1.2);
          return { x: f * x, y: f * y, z: f * z };
        };
      case 'rotational':
        return (x, y, z) => ({
          x: -fieldStrength * y,
          y: fieldStrength * x,
          z: fieldStrength * 0.2 * Math.sin(z)
        });
      case 'converging':
        return (x, y, z) => ({
          x: -fieldStrength * 0.8 * x,
          y: -fieldStrength * 0.8 * y,
          z: -fieldStrength * 0.8 * z
        });
      case 'diverging':
        return (x, y, z) => ({
          x: fieldStrength * 0.8 * x,
          y: fieldStrength * 0.8 * y,
          z: fieldStrength * 0.8 * z
        });
      case 'saddle':
        return (x, y, z) => ({
          x: fieldStrength * x,
          y: -fieldStrength * y,
          z: 0
        });
      case 'dipole':
        return (x, y, z) => {
          const d = 1.0;
          // +q at (0, d, 0)
          const r1x = x, r1y = y - d, r1z = z;
          const d1 = Math.pow(r1x * r1x + r1y * r1y + r1z * r1z + 0.15, 1.5);
          // -q at (0, -d, 0)
          const r2x = x, r2y = y + d, r2z = z;
          const d2 = Math.pow(r2x * r2x + r2y * r2y + r2z * r2z + 0.15, 1.5);
          return {
            x: fieldStrength * (r1x / d1 - r2x / d2),
            y: fieldStrength * (r1y / d1 - r2y / d2),
            z: fieldStrength * (r1z / d1 - r2z / d2)
          };
        };
      case 'custom':
        return parseCustomField(customP, customQ, customR);
      default:
        return () => ({ x: 0, y: 0, z: 0 });
    }
  }, [preset, fieldStrength, customP, customQ, customR]);

  // Telementry at probe point (1, 1, 1)
  const divAtProbe = useMemo(() => computeDivergence(fieldFn, 1, 1, 1), [fieldFn]);
  const curlAtProbe = useMemo(() => computeCurl(fieldFn, 1, 1, 1), [fieldFn]);

  // Setup 3D Scene Elements
  const handleSetup = (scene: THREE.Scene) => {
    // 1. Vector Arrows Group
    const vectorsGroup = new THREE.Group();
    scene.add(vectorsGroup);
    vectorsGroupRef.current = vectorsGroup;

    // 2. Particle Tracers System
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);

    const extent = 3.5;
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 2 * extent;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 2 * extent;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 2 * extent;

      pColors[i * 3] = 0.0;     // R
      pColors[i * 3 + 1] = 0.94; // G (Cyan)
      pColors[i * 3 + 2] = 1.0;  // B
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    particlesGeomRef.current = pGeom;
    particlePositionsRef.current = pPositions;

    const pMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const particlesObj = new THREE.Points(pGeom, pMat);
    scene.add(particlesObj);
  };

  // Re-populate Vector Arrows when settings change
  useEffect(() => {
    if (!vectorsGroupRef.current) return;
    const group = vectorsGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!showVectors) return;

    const extent = 3.0;
    const step = (2 * extent) / (vectorDensity - 1 || 1);
    const arrowGeomCone = new THREE.ConeGeometry(0.06, 0.2, 12);
    const arrowGeomCylinder = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8);

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < vectorDensity; i++) {
      const x = -extent + i * step;
      for (let j = 0; j < vectorDensity; j++) {
        const y = -extent + j * step;
        for (let k = 0; k < vectorDensity; k++) {
          const z = -extent + k * step;

          const f = fieldFn(x, y, z);
          const mag = vNorm(f);
          if (mag < 1e-4) continue;

          const dir = new THREE.Vector3(f.x, f.y, f.z).normalize();
          const length = Math.min(0.85, Math.max(0.2, mag * 0.4));

          // Color map based on magnitude: cyan to purple/pink
          const hue = THREE.MathUtils.lerp(0.5, 0.85, Math.min(1, mag / 3));
          const color = new THREE.Color().setHSL(hue, 1.0, 0.55);

          const mat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.35,
            roughness: 0.3
          });

          const arrow = new THREE.Group();
          arrow.position.set(x, y, z);

          const stem = new THREE.Mesh(arrowGeomCylinder, mat);
          stem.position.y = length * 0.35;
          stem.scale.set(1, length / 0.6, 1);

          const cone = new THREE.Mesh(arrowGeomCone, mat);
          cone.position.y = length * 0.75;

          arrow.add(stem);
          arrow.add(cone);
          arrow.quaternion.setFromUnitVectors(up, dir);

          group.add(arrow);
        }
      }
    }
  }, [fieldFn, vectorDensity, showVectors]);

  // Animation Loop: Move particles along vector field streamlines
  const handleAnimate = (delta: number) => {
    if (!isPlaying) return;
    if (!particlesGeomRef.current || !particlePositionsRef.current || !showParticles) return;

    const pos = particlePositionsRef.current;
    const extent = 3.5;
    const speed = animationSpeed * 2.5 * delta;

    for (let i = 0; i < particleCount; i++) {
      let px = pos[i * 3];
      let py = pos[i * 3 + 1];
      let pz = pos[i * 3 + 2];

      const f = fieldFn(px, py, pz);
      const mag = vNorm(f);

      if (mag > 1e-4) {
        // Runge-Kutta 2 step integration for particle path
        const k1x = (f.x / mag) * speed;
        const k1y = (f.y / mag) * speed;
        const k1z = (f.z / mag) * speed;

        const fMid = fieldFn(px + k1x * 0.5, py + k1y * 0.5, pz + k1z * 0.5);
        const midMag = vNorm(fMid) || 1;

        px += (fMid.x / midMag) * speed;
        py += (fMid.y / midMag) * speed;
        pz += (fMid.z / midMag) * speed;
      }

      // Wrap around bounds or re-emit near source
      if (Math.abs(px) > extent || Math.abs(py) > extent || Math.abs(pz) > extent || isNaN(px)) {
        px = (Math.random() - 0.5) * 2 * extent;
        py = (Math.random() - 0.5) * 2 * extent;
        pz = (Math.random() - 0.5) * 2 * extent;
      }

      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;
    }

    const posAttr = particlesGeomRef.current.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  };

  // Reset particles
  const handleResetParticles = () => {
    if (!particlePositionsRef.current || !particlesGeomRef.current) return;
    const pos = particlePositionsRef.current;
    const extent = 3.5;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * extent;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2 * extent;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * extent;
    }
    (particlesGeomRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  const formulaLatex = useMemo(() => {
    switch (preset) {
      case 'uniform':
        return `\\mathbf{F}(x,y,z) = ${fieldStrength.toFixed(1)}\\hat{\\mathbf{i}} + 0\\hat{\\mathbf{j}} + 0\\hat{\\mathbf{k}}`;
      case 'radial_source':
        return `\\mathbf{F}(x,y,z) = \\frac{${(fieldStrength * 2).toFixed(1)}}{(x^2+y^2+z^2)^{3/2}} (x\\hat{\\mathbf{i}} + y\\hat{\\mathbf{j}} + z\\hat{\\mathbf{k}})`;
      case 'radial_sink':
        return `\\mathbf{F}(x,y,z) = -\\frac{${(fieldStrength * 2).toFixed(1)}}{(x^2+y^2+z^2)^{3/2}} (x\\hat{\\mathbf{i}} + y\\hat{\\mathbf{j}} + z\\hat{\\mathbf{k}})`;
      case 'rotational':
        return `\\mathbf{F}(x,y,z) = -${fieldStrength.toFixed(1)}y\\hat{\\mathbf{i}} + ${fieldStrength.toFixed(1)}x\\hat{\\mathbf{j}} + 0\\hat{\\mathbf{k}}`;
      case 'converging':
        return `\\mathbf{F}(x,y,z) = -${fieldStrength.toFixed(1)}(x\\hat{\\mathbf{i}} + y\\hat{\\mathbf{j}} + z\\hat{\\mathbf{k}})`;
      case 'diverging':
        return `\\mathbf{F}(x,y,z) = ${fieldStrength.toFixed(1)}(x\\hat{\\mathbf{i}} + y\\hat{\\mathbf{j}} + z\\hat{\\mathbf{k}})`;
      case 'saddle':
        return `\\mathbf{F}(x,y,z) = ${fieldStrength.toFixed(1)}x\\hat{\\mathbf{i}} - ${fieldStrength.toFixed(1)}y\\hat{\\mathbf{j}} + 0\\hat{\\mathbf{k}}`;
      case 'dipole':
        return `\\mathbf{F}(\\mathbf{r}) = \\frac{1}{4\\pi\\varepsilon_0} \\left[ \\frac{q(\\mathbf{r}-\\mathbf{d})}{|\\mathbf{r}-\\mathbf{d}|^3} - \\frac{q(\\mathbf{r}+\\mathbf{d})}{|\\mathbf{r}+\\mathbf{d}|^3} \\right]`;
      case 'custom':
        return `\\mathbf{F}(x,y,z) = (${customP})\\hat{\\mathbf{i}} + (${customQ})\\hat{\\mathbf{j}} + (${customR})\\hat{\\mathbf{k}}`;
    }
  }, [preset, fieldStrength, customP, customQ, customR]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* Left 3D Viewport Column */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `3D FIELD: ${preset.toUpperCase()}`,
            vectorCount: showVectors ? vectorDensity * vectorDensity * vectorDensity : 0,
            particleCount: showParticles ? particleCount : 0,
            status: isPlaying ? 'SIMULATING' : 'PAUSED'
          }}
          overlayControls={
            <div className="flex items-center gap-2 p-1.5 glass-panel rounded-lg">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors ${
                  isPlaying ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Resume'}
              </button>

              <button
                onClick={handleResetParticles}
                className="p-2 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                title="Reset Particle Tracers"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          }
        />
      </div>

      {/* Right Control & Calculation Panel Column */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Preset Selector Card */}
        <div className="glass-panel p-4 rounded-xl border-cyan-500/30">
          <div className="flex items-center gap-2 mb-3 text-cyan-400 font-orbitron text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Vector Field Presets</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'radial_source', label: 'Radial Source (+q)' },
              { id: 'radial_sink', label: 'Radial Sink (-q)' },
              { id: 'rotational', label: 'Rotational / Vortex' },
              { id: 'dipole', label: 'Electric Dipole' },
              { id: 'diverging', label: 'Diverging Field' },
              { id: 'converging', label: 'Converging Field' },
              { id: 'saddle', label: 'Saddle / Hyperbolic' },
              { id: 'uniform', label: 'Uniform Field' },
              { id: 'custom', label: 'Custom Formula' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPreset(item.id as FieldPreset)}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                  preset === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Formula Inputs */}
          {preset === 'custom' && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/90 border border-purple-500/30 space-y-2.5">
              <div className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1.5">
                <Variable className="w-3.5 h-3.5" /> Define F(x, y, z) Components
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold w-4">P:</span>
                <input
                  type="text"
                  value={customP}
                  onChange={(e) => setCustomP(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  placeholder="-y"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold w-4">Q:</span>
                <input
                  type="text"
                  value={customQ}
                  onChange={(e) => setCustomQ(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  placeholder="x"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold w-4">R:</span>
                <input
                  type="text"
                  value={customR}
                  onChange={(e) => setCustomR(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  placeholder="0.5 * z"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sliders & Visual Options */}
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3.5">
          <div className="flex items-center gap-2 text-cyan-400 font-orbitron text-xs font-semibold uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Simulation Parameters</span>
          </div>

          {/* Field Strength */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Field Strength</span>
              <span className="font-mono text-cyan-300 font-semibold">{fieldStrength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={fieldStrength}
              onChange={(e) => setFieldStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Vector Density */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Vector Density (Grid)</span>
              <span className="font-mono text-cyan-300 font-semibold">{vectorDensity}³ ({vectorDensity ** 3})</span>
            </div>
            <input
              type="range"
              min="3"
              max="9"
              step="1"
              value={vectorDensity}
              onChange={(e) => setVectorDensity(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Particle Count */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Particle Streamlines</span>
              <span className="font-mono text-purple-300 font-semibold">{particleCount}</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={particleCount}
              onChange={(e) => setParticleCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Animation Speed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Flow Velocity</span>
              <span className="font-mono text-cyan-300 font-semibold">{animationSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-0"
              />
              Show Vectors
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showParticles}
                onChange={(e) => setShowParticles(e.target.checked)}
                className="rounded text-purple-500 focus:ring-0"
              />
              Show Particles
            </label>
          </div>
        </div>

        {/* Calculation Panel */}
        <CalculationPanel
          title="Field Calculus Telemetry"
          formulaLatex={formulaLatex}
          inputs={[
            { label: 'Strength', value: fieldStrength.toFixed(2) },
            { label: 'Density', value: `${vectorDensity}x${vectorDensity}x${vectorDensity}` },
            { label: 'Tracers', value: particleCount }
          ]}
          steps={[
            `\\text{Local Divergence at }(1,1,1): \\nabla \\cdot \\mathbf{F} = ${divAtProbe.toFixed(4)}`,
            `\\text{Local Curl at }(1,1,1): \\nabla \\times \\mathbf{F} = \\langle ${curlAtProbe.x.toFixed(3)}, ${curlAtProbe.y.toFixed(3)}, ${curlAtProbe.z.toFixed(3)} \\rangle`
          ]}
          resultLatex={`\\nabla \\cdot \\mathbf{F} = ${divAtProbe.toFixed(3)}, \\; |\\nabla \\times \\mathbf{F}| = ${vNorm(curlAtProbe).toFixed(3)}`}
          physicalMeaning="Vector fields assign a magnitude and direction to every point in space. Particle streamlines follow integral curves of the vector field dr/dt = F(r)."
        />
      </div>
    </div>
  );
};

export default FieldExplorerView;
