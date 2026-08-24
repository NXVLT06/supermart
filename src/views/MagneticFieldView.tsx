import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { 
  VectorFieldFn, 
  computeStraightWireBField, 
  computeLoopBField, 
  vNorm 
} from '../utils/mathEngine';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeftRight, 
  Compass, 
  Sliders, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';

export type WireGeometry = 'straight_wire' | 'circular_loop' | 'solenoid';

export const MagneticFieldView: React.FC = () => {
  const [wireType, setWireType] = useState<WireGeometry>('straight_wire');
  const [currentI, setCurrentI] = useState(3.0); // in Amperes
  const [loopRadius, setLoopRadius] = useState(1.5);
  const [amperianRadius, setAmperianRadius] = useState(1.8);
  const [isPlaying, setIsPlaying] = useState(true);

  const groupRef = useRef<THREE.Group | null>(null);
  const tracerParticlesRef = useRef<{
    geom: THREE.BufferGeometry;
    positions: Float32Array;
    radii: Float32Array;
    angles: Float32Array;
  } | null>(null);

  // Toggle/Reverse Current
  const handleReverseCurrent = () => {
    setCurrentI((prev) => -prev);
  };

  // Field Function
  const fieldFn: VectorFieldFn = useMemo(() => {
    if (wireType === 'straight_wire') {
      return (x, y, z) => computeStraightWireBField(currentI, x, y, z);
    } else if (wireType === 'circular_loop') {
      return (x, y, z) => computeLoopBField(currentI, loopRadius, x, y, z);
    } else {
      // Solenoid (series of 5 parallel loops along Z)
      return (x, y, z) => {
        let bx = 0, by = 0, bz = 0;
        for (let i = -2; i <= 2; i++) {
          const b = computeLoopBField(currentI * 0.4, loopRadius, x, y, z - i * 0.5);
          bx += b.x; by += b.y; bz += b.z;
        }
        return { x: bx, y: by, z: bz };
      };
    }
  }, [wireType, currentI, loopRadius]);

  // Ampère's Law Line Circulation along Amperian circle loop in xy-plane
  const amperianCirculation = useMemo(() => {
    const steps = 200;
    const dt = (2 * Math.PI) / steps;
    let circulation = 0;

    for (let i = 0; i < steps; i++) {
      const theta = i * dt;
      const x = amperianRadius * Math.cos(theta);
      const y = amperianRadius * Math.sin(theta);
      const dr = {
        x: -amperianRadius * Math.sin(theta) * dt,
        y: amperianRadius * Math.cos(theta) * dt,
        z: 0
      };
      const B = fieldFn(x, y, 0);
      circulation += B.x * dr.x + B.y * dr.y + B.z * dr.z;
    }
    return circulation;
  }, [fieldFn, amperianRadius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Build 3D Conductor Wire, Concentric B Loops, and Ampèrian Loop
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    tracerParticlesRef.current = null;

    // 1. Draw Physical Conductor Wire (Copper Cylinder / Torus)
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Copper Amber
      metalness: 0.85,
      roughness: 0.25
    });

    if (wireType === 'straight_wire') {
      const wireGeom = new THREE.CylinderGeometry(0.08, 0.08, 7.0, 24);
      const wire = new THREE.Mesh(wireGeom, wireMat);
      // Wire lies along Z-axis
      wire.rotateX(Math.PI / 2);
      group.add(wire);

      // Current Flow Arrow on Wire
      const cArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, currentI >= 0 ? 1 : -1),
        new THREE.Vector3(0, 0, 0),
        1.2,
        0x10b981,
        0.3,
        0.15
      );
      group.add(cArrow);
    } else if (wireType === 'circular_loop') {
      const loopGeom = new THREE.TorusGeometry(loopRadius, 0.06, 16, 64);
      const loop = new THREE.Mesh(loopGeom, wireMat);
      group.add(loop);
    } else {
      // Solenoid coils
      for (let i = -2; i <= 2; i++) {
        const loopGeom = new THREE.TorusGeometry(loopRadius, 0.05, 16, 48);
        const loop = new THREE.Mesh(loopGeom, wireMat);
        loop.position.z = i * 0.5;
        group.add(loop);
      }
    }

    // 2. Concentric Magnetic Field Lines B
    const numRings = 5;
    for (let rIdx = 1; rIdx <= numRings; rIdx++) {
      const r = 0.6 + rIdx * 0.5;
      const segments = 64;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0));
      }
      const ringGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const ringMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.45,
        linewidth: 1.5
      });
      const ring = new THREE.Line(ringGeom, ringMat);
      group.add(ring);
    }

    // 3. Ampèrian Loop (Cyan Glowing Dash Loop)
    const ampSegs = 64;
    const ampPts: THREE.Vector3[] = [];
    for (let i = 0; i <= ampSegs; i++) {
      const theta = (i / ampSegs) * Math.PI * 2;
      ampPts.push(new THREE.Vector3(amperianRadius * Math.cos(theta), amperianRadius * Math.sin(theta), 0.02));
    }
    const ampGeom = new THREE.BufferGeometry().setFromPoints(ampPts);
    const ampMat = new THREE.LineDashedMaterial({
      color: 0xa855f7,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 2.5
    });
    const ampLine = new THREE.Line(ampGeom, ampMat);
    ampLine.computeLineDistances();
    group.add(ampLine);

    // 4. Circulating Magnetic Particles
    const pCount = 300;
    const pPos = new Float32Array(pCount * 3);
    const pRadii = new Float32Array(pCount);
    const pAngles = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      const r = 0.5 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      pRadii[i] = r;
      pAngles[i] = angle;
      pPos[i * 3] = r * Math.cos(angle);
      pPos[i * 3 + 1] = r * Math.sin(angle);
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeom, pMat);
    group.add(particles);

    tracerParticlesRef.current = { geom: pGeom, positions: pPos, radii: pRadii, angles: pAngles };
  }, [wireType, currentI, loopRadius, amperianRadius]);

  // Animate circulating magnetic particles based on current direction
  const handleAnimate = (delta: number) => {
    if (!isPlaying || !tracerParticlesRef.current) return;
    const { geom, positions, radii, angles } = tracerParticlesRef.current;
    const count = positions.length / 3;
    const dirSign = currentI >= 0 ? 1 : -1;

    for (let i = 0; i < count; i++) {
      const r = radii[i];
      // Angular velocity omega = v / r ~ I / r^2
      const omega = (dirSign * Math.abs(currentI) * 1.5) / (r * r + 0.1);
      angles[i] += omega * delta;

      positions[i * 3] = r * Math.cos(angles[i]);
      positions[i * 3 + 1] = r * Math.sin(angles[i]);
    }

    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `MAGNETOSTATICS: ${wireType.toUpperCase()}`,
            magnitude: `Current I = ${currentI > 0 ? `+${currentI}` : currentI} A | ∮ B·dr = ${amperianCirculation.toFixed(2)}`,
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
                onClick={handleReverseCurrent}
                className="btn-purple px-3 py-1.5 rounded-md text-xs font-orbitron font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Reverse Current Direction"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Reverse Current
              </button>
            </div>
          }
        />
      </div>

      {/* Controls & Math */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>Conductor Geometry</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'straight_wire', label: 'Long Wire' },
              { id: 'circular_loop', label: 'Current Loop' },
              { id: 'solenoid', label: 'Solenoid' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setWireType(item.id as WireGeometry)}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  wireType === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <NumericInput
              label="Current Magnitude I"
              value={Math.abs(currentI)}
              min={0.1}
              max={10.0}
              step={0.1}
              unit="A"
              color="cyan"
              onChange={(v) => setCurrentI(currentI >= 0 ? v : -v)}
            />
            <NumericInput
              label="Loop / Conductor Radius"
              value={loopRadius}
              min={0.5}
              max={3.0}
              step={0.1}
              unit="m"
              color="emerald"
              onChange={setLoopRadius}
            />
            <NumericInput
              label="Ampèrian Loop Radius"
              value={amperianRadius}
              min={0.5}
              max={4.0}
              step={0.1}
              unit="m"
              color="purple"
              onChange={setAmperianRadius}
            />
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Ampère's Law Results"
          lawName="∮ B·dr = μ₀ I_enc"
          results={[
            {
              label: 'Line Circulation  ∮ B·dr',
              value: amperianCirculation,
              unit: 'T·m',
              formula: '\\oint_C \\mathbf{B} \\cdot d\\mathbf{r}',
              highlight: 'cyan'
            },
            {
              label: 'Theoretical μ₀ I_enc  (Ampère)',
              value: 4 * Math.PI * 1e-7 * currentI * 1e7,
              unit: 'T·m',
              formula: '\\mu_0 I_{\\text{enc}}',
              highlight: 'purple'
            },
            {
              label: 'B-field at Ampèrian Loop',
              value: vNorm(fieldFn(amperianRadius, 0, 0)),
              unit: 'T',
              highlight: 'emerald'
            },
            {
              label: 'Current I (signed)',
              value: currentI,
              unit: 'A',
              highlight: currentI >= 0 ? 'cyan' : 'red'
            }
          ]}
        />

        {/* Calculation Panel */}
        <CalculationPanel
          title="Ampère's Circuital Law"
          formulaLatex="\oint_C \mathbf{B} \cdot d\mathbf{r} = \mu_0 I_{\text{enclosed}}"
          inputs={[
            { label: 'Current I', value: `${currentI.toFixed(1)} A` },
            { label: 'Geometry', value: wireType.toUpperCase() },
            { label: 'Loop Radius', value: `${amperianRadius.toFixed(1)} m` }
          ]}
          steps={[
            `\\text{1. Biot-Savart differential law: } d\\mathbf{B} = \\frac{\\mu_0 I}{4\\pi} \\frac{d\\mathbf{l} \\times \\hat{\\mathbf{r}}}{r^2}`,
            `\\text{2. Circular symmetry along path } C: B(r) = \\frac{\\mu_0 I}{2\\pi r}`,
            `\\text{3. Integrate line circulation: } \\oint_C B \\, dl = \\left(\\frac{\\mu_0 I}{2\\pi r}\\right)(2\\pi r) = \\mu_0 I`,
            `\\text{4. Evaluated Line Circulation } = ${amperianCirculation.toFixed(4)}`
          ]}
          resultLatex={`\\oint_C \\mathbf{B} \\cdot d\\mathbf{r} = \\mu_0 I_{\\text{enc}}`}
          physicalMeaning="Ampère's law connects the line integral of magnetic field B around any closed loop to the electric current I piercing through the loop surface, a direct physical manifestation of Stokes' Theorem."
        />
      </div>
    </div>
  );
};

export default MagneticFieldView;
