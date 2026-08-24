import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { VectorFieldFn, verifyGaussTheorem, computeDivergence } from '../utils/mathEngine';
import { ShieldCheck, Play, Pause, Sliders, CheckCircle2, Box, Compass } from 'lucide-react';

export const GaussTheoremView: React.FC = () => {
  const [radius, setRadius] = useState(2.0);
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [preset, setPreset] = useState<'radial_source' | 'diverging_linear' | 'cubic' | 'mixed'>('radial_source');
  const [isPlaying, setIsPlaying] = useState(true);

  const groupRef = useRef<THREE.Group | null>(null);
  const particleGroupRef = useRef<{
    geom: THREE.BufferGeometry;
    positions: Float32Array;
  } | null>(null);

  // 3D Vector Field F(x, y, z)
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (preset) {
      case 'radial_source':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.2;
          const factor = (fieldStrength * 2.0) / Math.pow(rSq, 1.2);
          return { x: factor * x, y: factor * y, z: factor * z };
        };
      case 'diverging_linear':
        // F = (a x, a y, a z) -> div F = 3 a
        return (x, y, z) => ({
          x: fieldStrength * 0.8 * x,
          y: fieldStrength * 0.8 * y,
          z: fieldStrength * 0.8 * z
        });
      case 'cubic':
        // F = (x^3, y^3, z^3) -> div F = 3(x^2 + y^2 + z^2)
        return (x, y, z) => ({
          x: fieldStrength * x * x * x * 0.2,
          y: fieldStrength * y * y * y * 0.2,
          z: fieldStrength * z * z * z * 0.2
        });
      case 'mixed':
        return (x, y, z) => ({
          x: fieldStrength * (2 * x + Math.sin(y)),
          y: fieldStrength * (3 * y + Math.cos(z)),
          z: fieldStrength * (x * z)
        });
    }
  }, [preset, fieldStrength]);

  // Independent numerical verification of Gauss Divergence Theorem
  const verification = useMemo(() => {
    return verifyGaussTheorem(fieldFn, radius, 36, 36, 28);
  }, [fieldFn, radius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Re-build 3D Gaussian Sphere, Outward Normals & Emission Particles
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    particleGroupRef.current = null;

    // 1. Semi-transparent Closed Gaussian Sphere Surface
    const sphereGeom = new THREE.SphereGeometry(radius, 32, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.3
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    group.add(sphereMesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.25 });
    const wireMesh = new THREE.Mesh(sphereGeom, wireMat);
    group.add(wireMesh);

    // 2. Outward Normal Flux Arrows across sphere surface
    const arrowCone = new THREE.ConeGeometry(0.04, 0.16, 8);
    const arrowStem = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6);
    const nMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.6 });
    const up = new THREE.Vector3(0, 1, 0);

    const uSteps = 12;
    const vSteps = 18;
    for (let i = 1; i < uSteps; i++) {
      const phi = (i / uSteps) * Math.PI;
      for (let j = 0; j < vSteps; j++) {
        const theta = (j / vSteps) * Math.PI * 2;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        const normal = new THREE.Vector3(x, y, z).normalize();
        const arrow = new THREE.Group();
        arrow.position.set(x, y, z);

        const stem = new THREE.Mesh(arrowStem, nMat);
        stem.position.y = 0.18;
        const cone = new THREE.Mesh(arrowCone, nMat);
        cone.position.y = 0.38;

        arrow.add(stem);
        arrow.add(cone);
        arrow.quaternion.setFromUnitVectors(up, normal);
        group.add(arrow);
      }
    }

    // 3. Dynamic Emission Particles flowing through Gaussian boundary
    const count = 400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * radius * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeom, pMat);
    group.add(particles);

    particleGroupRef.current = { geom: pGeom, positions: pos };
  }, [radius, fieldFn]);

  // Particle emission animation loop
  const handleAnimate = (delta: number) => {
    if (!isPlaying || !particleGroupRef.current) return;
    const { geom, positions } = particleGroupRef.current;
    const count = positions.length / 3;
    const dt = delta * 1.5;

    for (let i = 0; i < count; i++) {
      let px = positions[i * 3];
      let py = positions[i * 3 + 1];
      let pz = positions[i * 3 + 2];

      const f = fieldFn(px, py, pz);
      px += f.x * dt;
      py += f.y * dt;
      pz += f.z * dt;

      const dist = Math.sqrt(px * px + py * py + pz * pz);
      if (dist > radius * 1.4) {
        // Re-emit near center
        const r = Math.random() * 0.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        px = r * Math.sin(phi) * Math.cos(theta);
        py = r * Math.sin(phi) * Math.sin(theta);
        pz = r * Math.cos(phi);
      }

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
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
            fieldTitle: `GAUSS DIVERGENCE LAB`,
            magnitude: `Flux = ${verification.lhsValue.toFixed(3)} | Div = ${verification.rhsValue.toFixed(3)}`,
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
            <span>3D Vector Field Preset</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'radial_source', label: 'Coulomb Source' },
              { id: 'diverging_linear', label: 'Linear Divergence' },
              { id: 'cubic', label: 'Cubic (x³, y³, z³)' },
              { id: 'mixed', label: 'Mixed Coupled' }
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
              label="Gaussian Sphere Radius R"
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
              color="purple"
              onChange={setFieldStrength}
            />
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Gauss Divergence Theorem"
          lawName="∯ ∂V F·n̂ dS = ∭V (∇·F) dV"
          verified={verification.isVerified}
          results={[
            {
              label: 'Surface Flux (LHS)  ∯ F·n̂ dS',
              value: verification.lhsValue,
              unit: 'Wb',
              formula: '\\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS',
              highlight: 'cyan'
            },
            {
              label: 'Volume Divergence (RHS)  ∭ ∇·F dV',
              value: verification.rhsValue,
              unit: 'Wb',
              formula: '\\iiint_V (\\nabla \\cdot \\mathbf{F}) \\, dV',
              highlight: 'purple'
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
            }
          ]}
        />

        {/* Calculation Panel with Independent LHS & RHS Validation */}
        <CalculationPanel
          title="Gauss' Divergence Theorem"
          formulaLatex="\oiint_{\partial V} \mathbf{F} \cdot \hat{\mathbf{n}} \, dS = \iiint_V (\nabla \cdot \mathbf{F}) \, dV"
          inputs={[
            { label: 'Surface', value: 'Closed Sphere ∂V' },
            { label: 'Radius R', value: radius.toFixed(1), unit: 'm' },
            { label: 'Field Type', value: preset.toUpperCase() }
          ]}
          lhsName="LHS: Net Outward Flux ∯ ∂V F · n̂ dS"
          lhsValue={verification.lhsValue}
          rhsName="RHS: Volume Divergence ∭ V (∇·F) dV"
          rhsValue={verification.rhsValue}
          difference={verification.difference}
          relativeErrorPercent={verification.relativeErrorPercent}
          isVerified={verification.isVerified}
          steps={verification.steps}
          resultLatex="\oiint_{\partial V} \mathbf{F} \cdot \hat{\mathbf{n}} \, dS \equiv \iiint_V (\nabla \cdot \mathbf{F}) \, dV"
          physicalMeaning="Gauss's theorem proves that the total outward flux of a vector field through any closed boundary surface equals the total volume integral of divergence (sources minus sinks) enclosed inside. In electrostatics: ∮ E · dA = Q_enc / ε0."
        />
      </div>
    </div>
  );
};

export default GaussTheoremView;
