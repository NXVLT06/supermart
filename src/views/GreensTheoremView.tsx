import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { VectorFieldFn, verifyGreensTheorem, computeCurl } from '../utils/mathEngine';
import { ShieldCheck, Play, Pause, RotateCcw, Sliders, CheckCircle2, Compass } from 'lucide-react';

export const GreensTheoremView: React.FC = () => {
  const [radius, setRadius] = useState(2.0);
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [preset, setPreset] = useState<'vortex' | 'shear' | 'polynomial' | 'coupled'>('vortex');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressT, setProgressT] = useState(0);

  const groupRef = useRef<THREE.Group | null>(null);
  const boundaryParticleRef = useRef<THREE.Mesh | null>(null);

  // 2D Vector Field F(x, y) = (L(x,y), M(x,y))
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (preset) {
      case 'vortex':
        // L = -strength * y, M = strength * x -> dM/dx - dL/dy = 2 * strength
        return (x, y) => ({ x: -fieldStrength * y, y: fieldStrength * x, z: 0 });
      case 'shear':
        // L = 0, M = strength * x^2 -> dM/dx - dL/dy = 2 * strength * x
        return (x, y) => ({ x: 0, y: fieldStrength * x * x * 0.5, z: 0 });
      case 'polynomial':
        // L = -y^3, M = x^3 -> curl_z = 3(x^2 + y^2)
        return (x, y) => ({ x: -fieldStrength * y * y * y * 0.25, y: fieldStrength * x * x * x * 0.25, z: 0 });
      case 'coupled':
        return (x, y) => ({ x: fieldStrength * (x * y - y * y), y: fieldStrength * (x * x + 2 * x * y), z: 0 });
    }
  }, [preset, fieldStrength]);

  // Independent numerical verification of Green's theorem
  const verification = useMemo(() => {
    return verifyGreensTheorem(fieldFn, radius, 360, 60);
  }, [fieldFn, radius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Rebuild 3D Boundary Curve and Interior Curl Area Grid
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // 1. Interior Enclosed Region Disk with 2D Curl Heatmap
    const diskGeom = new THREE.CircleGeometry(radius, 48);
    const pos = diskGeom.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const curl = computeCurl(fieldFn, x, y, 0).z;
      const norm = THREE.MathUtils.clamp((curl + 2) / 4.0, 0, 1);
      const col = new THREE.Color().setHSL(0.65 - norm * 0.65, 1.0, 0.5);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    diskGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const diskMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      roughness: 0.3
    });

    const disk = new THREE.Mesh(diskGeom, diskMat);
    group.add(disk);

    // 2. Boundary Curve C Line
    const segments = 120;
    const boundaryPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      boundaryPoints.push(new THREE.Vector3(radius * Math.cos(theta), radius * Math.sin(theta), 0.02));
    }

    const bGeom = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
    const bMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
    const bLine = new THREE.Line(bGeom, bMat);
    group.add(bLine);

    // 3. Moving Tracer Particle on Boundary Curve
    const pGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
    const particle = new THREE.Mesh(pGeom, pMat);
    particle.position.set(radius, 0, 0.04);
    group.add(particle);
    boundaryParticleRef.current = particle;

    // 4. Direction arrows along boundary to show counter-clockwise orientation
    const up = new THREE.Vector3(0, 1, 0);
    const coneGeom = new THREE.ConeGeometry(0.06, 0.18, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.5 });

    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const tangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0).normalize();

      const cone = new THREE.Mesh(coneGeom, coneMat);
      cone.position.set(x, y, 0.03);
      cone.quaternion.setFromUnitVectors(up, tangent);
      group.add(cone);
    }
  }, [radius, fieldFn]);

  // Animation Frame
  const handleAnimate = (delta: number) => {
    if (!isPlaying) return;
    setProgressT((prev) => {
      let next = prev + delta * 0.4;
      if (next > Math.PI * 2) next = 0;

      if (boundaryParticleRef.current) {
        boundaryParticleRef.current.position.set(
          radius * Math.cos(next),
          radius * Math.sin(next),
          0.04
        );
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `GREEN'S THEOREM LAB`,
            magnitude: `LHS = ${verification.lhsValue.toFixed(3)} | RHS = ${verification.rhsValue.toFixed(3)}`,
            status: verification.isVerified ? 'VERIFIED (Δ ≈ 0)' : 'CALCULATING'
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
            <Compass className="w-4 h-4" />
            <span>2D Field Presets</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'vortex', label: 'Rotational (-y, x)' },
              { id: 'shear', label: 'Shear (0, x²)' },
              { id: 'polynomial', label: 'Cubic (-y³, x³)' },
              { id: 'coupled', label: 'Coupled (xy-y², x²+2xy)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPreset(item.id as any)}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  preset === item.id
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
              label="Disk Radius R"
              value={radius}
              min={0.5}
              max={4.0}
              step={0.1}
              unit="m"
              color="cyan"
              onChange={setRadius}
            />
            <NumericInput
              label="Field Strength"
              value={fieldStrength}
              min={0.1}
              max={5.0}
              step={0.1}
              unit="×"
              color="emerald"
              onChange={setFieldStrength}
            />
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Green's Theorem Results"
          lawName="∮ ∂D (L dx + M dy) = ∬ D (∂M/∂x − ∂L/∂y) dA"
          verified={verification.isVerified}
          results={[
            {
              label: 'Line Circulation (LHS)  ∮ L dx + M dy',
              value: verification.lhsValue,
              formula: '\\oint_{\\partial D} (L\\,dx + M\\,dy)',
              highlight: 'cyan'
            },
            {
              label: 'Curl Area Integral (RHS)  ∬ (∇×F)_z dA',
              value: verification.rhsValue,
              formula: '\\iint_D \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA',
              highlight: 'emerald'
            },
            {
              label: '|LHS − RHS| Absolute Error',
              value: verification.difference,
              highlight: 'amber'
            },
            {
              label: 'Relative Error %',
              value: verification.relativeErrorPercent,
              unit: '%',
              highlight: verification.isVerified ? 'emerald' : 'amber'
            },
            {
              label: 'Curl_z at Origin (∂M/∂x − ∂L/∂y)',
              value: computeCurl(fieldFn, 0, 0, 0).z,
              highlight: 'purple'
            }
          ]}
        />

        {/* Calculation Panel with Independent LHS & RHS Validation */}
        <CalculationPanel
          title="Green's Theorem Verification"
          formulaLatex="\oint_{\partial D} (L\,dx + M\,dy) = \iint_D \left(\frac{\partial M}{\partial x} - \frac{\partial L}{\partial y}\right) dA"
          inputs={[
            { label: 'Domain', value: 'Circle Disk D' },
            { label: 'Radius R', value: radius.toFixed(1), unit: 'm' },
            { label: 'Field Type', value: preset.toUpperCase() }
          ]}
          lhsName="LHS: Line Integral ∮ ∂D (L dx + M dy)"
          lhsValue={verification.lhsValue}
          rhsName="RHS: Area Integral ∬ D (curl F) dA"
          rhsValue={verification.rhsValue}
          difference={verification.difference}
          relativeErrorPercent={verification.relativeErrorPercent}
          isVerified={verification.isVerified}
          steps={verification.steps}
          resultLatex="\oint_{\partial D} \mathbf{F} \cdot d\mathbf{r} \equiv \iint_D (\nabla \times \mathbf{F})_z \, dA"
          physicalMeaning="Green's theorem establishes that the macroscopic counter-clockwise circulation around a boundary curve equals the sum of all microscopic rotational curls inside the enclosed region."
        />
      </div>
    </div>
  );
};

export default GreensTheoremView;
