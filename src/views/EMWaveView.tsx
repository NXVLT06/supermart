import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { computeEMWave } from '../utils/mathEngine';
import { Play, Pause, RotateCcw, Radio, Sliders, Sparkles, Waves } from 'lucide-react';

export const EMWaveView: React.FC = () => {
  const [amplitude, setAmplitude] = useState(1.5);
  const [frequency, setFrequency] = useState(1.0);
  const [wavelength, setWavelength] = useState(4.0);
  const [propagationSpeed, setPropagationSpeed] = useState(1.0);
  const [polarization, setPolarization] = useState<'linear' | 'circular'>('linear');
  const [isPlaying, setIsPlaying] = useState(true);

  const groupRef = useRef<THREE.Group | null>(null);
  const eArrowsGroupRef = useRef<THREE.Group | null>(null);
  const bArrowsGroupRef = useRef<THREE.Group | null>(null);
  const eLineRef = useRef<THREE.Line | null>(null);
  const bLineRef = useRef<THREE.Line | null>(null);
  const poyntingArrowRef = useRef<THREE.ArrowHelper | null>(null);

  const numPoints = 120;
  const extentX = 8.0;

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // Propagation axis line
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-extentX / 2, 0, 0),
      new THREE.Vector3(extentX / 2, 0, 0)
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
    const axisLine = new THREE.Line(axisGeom, axisMat);
    group.add(axisLine);

    // E-field curve (Cyan)
    const eGeom = new THREE.BufferGeometry();
    const ePositions = new Float32Array(numPoints * 3);
    eGeom.setAttribute('position', new THREE.BufferAttribute(ePositions, 3));
    const eMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
    const eLine = new THREE.Line(eGeom, eMat);
    group.add(eLine);
    eLineRef.current = eLine;

    // B-field curve (Purple)
    const bGeom = new THREE.BufferGeometry();
    const bPositions = new Float32Array(numPoints * 3);
    bGeom.setAttribute('position', new THREE.BufferAttribute(bPositions, 3));
    const bMat = new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 3 });
    const bLine = new THREE.Line(bGeom, bMat);
    group.add(bLine);
    bLineRef.current = bLine;

    // E and B vector arrows group
    const eArrowsGroup = new THREE.Group();
    const bArrowsGroup = new THREE.Group();
    group.add(eArrowsGroup);
    group.add(bArrowsGroup);
    eArrowsGroupRef.current = eArrowsGroup;
    bArrowsGroupRef.current = bArrowsGroup;

    // Poynting Vector Arrow (Green / Orange)
    const pArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(extentX / 2 - 0.5, 0, 0),
      1.5,
      0x10b981,
      0.35,
      0.15
    );
    group.add(pArrow);
    poyntingArrowRef.current = pArrow;
  };

  // Animation Loop: Dynamically update oscillating E and B vectors
  const handleAnimate = (_delta: number, time: number) => {
    if (!isPlaying || !eLineRef.current || !bLineRef.current || !eArrowsGroupRef.current || !bArrowsGroupRef.current) return;

    const ePosAttr = eLineRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const bPosAttr = bLineRef.current.geometry.attributes.position as THREE.BufferAttribute;

    const eGroup = eArrowsGroupRef.current;
    const bGroup = bArrowsGroupRef.current;

    while (eGroup.children.length > 0) eGroup.remove(eGroup.children[0]);
    while (bGroup.children.length > 0) bGroup.remove(bGroup.children[0]);

    const arrowInterval = 6;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < numPoints; i++) {
      const x = -extentX / 2 + (i / (numPoints - 1)) * extentX;
      const { E, B } = computeEMWave(x, time, {
        amplitude,
        frequency,
        wavelength,
        speed: propagationSpeed,
        polarization
      });

      ePosAttr.setXYZ(i, x, E.y, E.z);
      bPosAttr.setXYZ(i, x, B.y, B.z);

      // Draw instanced vector stem arrows every few samples
      if (i % arrowInterval === 0) {
        // E arrow (Cyan)
        const eMag = Math.sqrt(E.y * E.y + E.z * E.z);
        if (eMag > 0.05) {
          const eDir = new THREE.Vector3(0, E.y, E.z).normalize();
          const eArrow = new THREE.ArrowHelper(eDir, new THREE.Vector3(x, 0, 0), eMag, 0x00f0ff, 0.15, 0.08);
          eGroup.add(eArrow);
        }

        // B arrow (Purple)
        const bMag = Math.sqrt(B.y * B.y + B.z * B.z);
        if (bMag > 0.05) {
          const bDir = new THREE.Vector3(0, B.y, B.z).normalize();
          const bArrow = new THREE.ArrowHelper(bDir, new THREE.Vector3(x, 0, 0), bMag, 0xa855f7, 0.15, 0.08);
          bGroup.add(bArrow);
        }
      }
    }

    ePosAttr.needsUpdate = true;
    bPosAttr.needsUpdate = true;
  };

  const waveVectorK = ((2 * Math.PI) / wavelength).toFixed(2);
  const angularFreqOmega = (2 * Math.PI * frequency).toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `ELECTROMAGNETIC WAVE (${polarization.toUpperCase()})`,
            magnitude: `E_0 = ${amplitude.toFixed(1)} V/m | B_0 = ${(amplitude / 2).toFixed(1)} T`,
            status: isPlaying ? 'PROPAGATING' : 'PAUSED'
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
            </div>
          }
        />
      </div>

      {/* Controls & Math */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>Wave Polarization Mode</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'linear', label: 'Linear Transverse' },
              { id: 'circular', label: 'Circular Helical' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPolarization(item.id as any)}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  polarization === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div className="space-y-2 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">E-Field Amplitude E₀</span>
                <span className="font-mono text-cyan-300 font-semibold">{amplitude.toFixed(1)} V/m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Frequency f</span>
                <span className="font-mono text-purple-300 font-semibold">{frequency.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Wavelength λ</span>
                <span className="font-mono text-cyan-300 font-semibold">{wavelength.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.5"
                value={wavelength}
                onChange={(e) => setWavelength(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Propagation Speed c</span>
                <span className="font-mono text-emerald-300 font-semibold">{propagationSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={propagationSpeed}
                onChange={(e) => setPropagationSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="glass-panel p-3 rounded-xl border-slate-800 text-xs flex items-center justify-around font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-slate-300">E-Field</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <span className="text-slate-300">B-Field</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Poynting S</span>
          </div>
        </div>

        {/* Calculation Panel */}
        <CalculationPanel
          title="Electromagnetic Wave Equations"
          formulaLatex="\mathbf{S} = \frac{1}{\mu_0} (\mathbf{E} \times \mathbf{B}), \quad \nabla^2 \mathbf{E} = \frac{1}{c^2}\frac{\partial^2 \mathbf{E}}{\partial t^2}"
          inputs={[
            { label: 'Wavevector k', value: `${waveVectorK} rad/m` },
            { label: 'Angular Freq ω', value: `${angularFreqOmega} rad/s` },
            { label: 'Speed c', value: '1 / √(ε₀μ₀)' }
          ]}
          steps={[
            `\\text{1. Transverse Electric Wave: } \\mathbf{E}(x,t) = ${amplitude.toFixed(1)} \\sin(${waveVectorK} x - ${angularFreqOmega} t) \\hat{\\mathbf{j}}`,
            `\\text{2. Orthogonal Magnetic Wave: } \\mathbf{B}(x,t) = ${(amplitude / 2).toFixed(1)} \\sin(${waveVectorK} x - ${angularFreqOmega} t) \\hat{\\mathbf{k}}`,
            `\\text{3. Compute Poynting Energy Flux: } \\mathbf{S} = \\frac{1}{\\mu_0}(\\mathbf{E} \\times \\mathbf{B}) \\propto +\\hat{\\mathbf{i}}`,
            `\\text{4. Phase Velocity } v_p = \\frac{\\omega}{k} = ${(parseFloat(angularFreqOmega) / parseFloat(waveVectorK)).toFixed(2)} \\text{ m/s}`
          ]}
          resultLatex="\mathbf{E} \perp \mathbf{B} \perp \mathbf{k} \quad (\text{Self-sustaining transverse EM wave})"
          physicalMeaning="Maxwell's equations predict that changing electric fields create magnetic fields (Maxwell-Ampère Law) and changing magnetic fields create electric fields (Faraday's Law), enabling electromagnetic waves to propagate across the cosmos at the speed of light."
        />
      </div>
    </div>
  );
};

export default EMWaveView;
