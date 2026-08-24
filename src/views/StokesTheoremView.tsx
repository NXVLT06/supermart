import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { VectorFieldFn, verifyStokesTheorem, computeCurl, vNorm } from '../utils/mathEngine';
import { ShieldCheck, Play, Pause, Sliders, CheckCircle2, RotateCw, Compass } from 'lucide-react';

export const StokesTheoremView: React.FC = () => {
  const [radius, setRadius] = useState(2.0);
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [preset, setPreset] = useState<'vortex' | 'swirl_z' | 'shear' | 'polynomial'>('vortex');
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressT, setProgressT] = useState(0);

  const groupRef = useRef<THREE.Group | null>(null);
  const boundaryParticleRef = useRef<THREE.Mesh | null>(null);

  // 3D Vector Field F(x, y, z)
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (preset) {
      case 'vortex':
        // F = (-y, x, 0) -> curl F = (0, 0, 2)
        return (x, y, _z) => ({
          x: -fieldStrength * y,
          y: fieldStrength * x,
          z: 0
        });
      case 'swirl_z':
        // F = (-y, x, z) -> curl F = (0, 0, 2)
        return (x, y, z) => ({
          x: -fieldStrength * y,
          y: fieldStrength * x,
          z: fieldStrength * 0.5 * z
        });
      case 'shear':
        // F = (0, x^2, z) -> curl F = (0, 0, 2x)
        return (x, y, z) => ({
          x: 0,
          y: fieldStrength * x * x * 0.5,
          z: fieldStrength * z * 0.2
        });
      case 'polynomial':
        // F = (y^2, z^2, x^2) -> curl F = (-2z, -2x, -2y)
        return (x, y, z) => ({
          x: fieldStrength * y * y * 0.3,
          y: fieldStrength * z * z * 0.3,
          z: fieldStrength * x * x * 0.3
        });
    }
  }, [preset, fieldStrength]);

  // Independent numerical verification of Stokes' Theorem
  const verification = useMemo(() => {
    return verifyStokesTheorem(fieldFn, radius, 360, 36, 36);
  }, [fieldFn, radius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Re-build 3D Curved Surface, Boundary Loop, and Curl Vectors
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // 1. Upper Hemisphere Surface S (z >= 0)
    const domeGeom = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.3
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    group.add(dome);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.3 });
    const wire = new THREE.Mesh(domeGeom, wireMat);
    group.add(wire);

    // 2. Boundary Curve Loop ∂S (Circle in xy-plane at z = 0)
    const segments = 120;
    const boundaryPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      boundaryPoints.push(new THREE.Vector3(radius * Math.cos(theta), radius * Math.sin(theta), 0.01));
    }
    const bGeom = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
    const bMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 });
    const bLine = new THREE.Line(bGeom, bMat);
    group.add(bLine);

    // 3. Boundary Circulation Direction Cones
    const up = new THREE.Vector3(0, 1, 0);
    const coneGeom = new THREE.ConeGeometry(0.06, 0.18, 8);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.6 });

    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const tangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0).normalize();

      const cone = new THREE.Mesh(coneGeom, coneMat);
      cone.position.set(x, y, 0.02);
      cone.quaternion.setFromUnitVectors(up, tangent);
      group.add(cone);
    }

    // 4. Moving Tracer Particle on Boundary ∂S
    const pGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
    const particle = new THREE.Mesh(pGeom, pMat);
    particle.position.set(radius, 0, 0.03);
    group.add(particle);
    boundaryParticleRef.current = particle;

    // 5. Surface Curl Normal Vectors (∇×F · n̂) across hemisphere
    const arrowCone = new THREE.ConeGeometry(0.04, 0.16, 8);
    const arrowStem = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6);
    const curlMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.5 });

    const uSteps = 8;
    const vSteps = 16;
    for (let i = 1; i <= uSteps; i++) {
      const phi = (i / (uSteps + 1)) * (Math.PI / 2);
      for (let j = 0; j < vSteps; j++) {
        const theta = (j / vSteps) * Math.PI * 2;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        const curl = computeCurl(fieldFn, x, y, z);
        const normal = new THREE.Vector3(x, y, z).normalize();
        const curlFlux = curl.x * normal.x + curl.y * normal.y + curl.z * normal.z;

        if (Math.abs(curlFlux) > 0.05) {
          const arrow = new THREE.Group();
          arrow.position.set(x, y, z);

          const stem = new THREE.Mesh(arrowStem, curlMat);
          stem.position.y = 0.18;
          const cone = new THREE.Mesh(arrowCone, curlMat);
          cone.position.y = 0.38;

          arrow.add(stem);
          arrow.add(cone);
          arrow.quaternion.setFromUnitVectors(up, normal);
          group.add(arrow);
        }
      }
    }
  }, [radius, fieldFn]);

  // Animation Loop
  const handleAnimate = (delta: number) => {
    if (!isPlaying) return;
    setProgressT((prev) => {
      let next = prev + delta * 0.5;
      if (next > Math.PI * 2) next = 0;

      if (boundaryParticleRef.current) {
        boundaryParticleRef.current.position.set(
          radius * Math.cos(next),
          radius * Math.sin(next),
          0.03
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
            fieldTitle: `STOKES' THEOREM LAB`,
            magnitude: `Circulation = ${verification.lhsValue.toFixed(3)} | Curl Flux = ${verification.rhsValue.toFixed(3)}`,
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
              { id: 'vortex', label: 'Rotational (-y, x, 0)' },
              { id: 'swirl_z', label: 'Swirl + Axial Z' },
              { id: 'shear', label: 'Shear (0, x², z)' },
              { id: 'polynomial', label: 'Coupled (y², z², x²)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPreset(item.id as any)}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  preset === item.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <NumericInput
              label="Surface Dome Radius R"
              value={radius}
              min={0.5}
              max={4.0}
              step={0.1}
              unit="m"
              color="purple"
              onChange={setRadius}
            />
            <NumericInput
              label="Field Strength"
              value={fieldStrength}
              min={0.1}
              max={5.0}
              step={0.1}
              unit="×"
              color="cyan"
              onChange={setFieldStrength}
            />
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Stokes' Theorem Results"
          lawName="∮ ∂S F·dr = ∬ S (∇×F)·n̂ dS"
          verified={verification.isVerified}
          results={[
            {
              label: 'Boundary Circulation (LHS)  ∮ ∂S F·dr',
              value: verification.lhsValue,
              formula: '\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r}',
              highlight: 'cyan'
            },
            {
              label: 'Surface Curl Flux (RHS)  ∬ (∇×F)·n̂ dS',
              value: verification.rhsValue,
              formula: '\\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS',
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
            },
            {
              label: '|∇×F| at Center',
              value: vNorm(computeCurl(fieldFn, 0, 0, 0.01)),
              highlight: 'emerald'
            }
          ]}
        />

        {/* Calculation Panel with Independent LHS & RHS Validation */}
        <CalculationPanel
          title="Stokes' Theorem Verification"
          formulaLatex="\oint_{\partial S} \mathbf{F} \cdot d\mathbf{r} = \iint_S (\nabla \times \mathbf{F}) \cdot \hat{\mathbf{n}} \, dS"
          inputs={[
            { label: 'Surface S', value: 'Open Hemisphere Cap' },
            { label: 'Boundary ∂S', value: 'Closed Circle (z=0)' },
            { label: 'Radius R', value: radius.toFixed(1), unit: 'm' }
          ]}
          lhsName="LHS: Boundary Circulation ∮ ∂S F · dr"
          lhsValue={verification.lhsValue}
          rhsName="RHS: Surface Curl Flux ∬ S (∇×F) · n̂ dS"
          rhsValue={verification.rhsValue}
          difference={verification.difference}
          relativeErrorPercent={verification.relativeErrorPercent}
          isVerified={verification.isVerified}
          steps={verification.steps}
          resultLatex="\oint_{\partial S} \mathbf{F} \cdot d\mathbf{r} \equiv \iint_S (\nabla \times \mathbf{F}) \cdot \hat{\mathbf{n}} \, dS"
          physicalMeaning="Stokes' theorem establishes that the line circulation around any closed boundary loop ∂S equals the surface integral of curl flux across any 3D open surface capped by that boundary. In electrodynamics: Faraday's Law ∮ E · dr = -dΦB/dt."
        />
      </div>
    </div>
  );
};

export default StokesTheoremView;
