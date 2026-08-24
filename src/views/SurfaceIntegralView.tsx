import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { 
  VectorFieldFn, 
  calculateSurfaceFlux, 
  vNorm 
} from '../utils/mathEngine';
import { Layers, Sliders, Play, Pause, Sparkles, Compass } from 'lucide-react';

export type SurfaceType = 'disk' | 'paraboloid' | 'sphere_cap' | 'cylinder_side';

export const SurfaceIntegralView: React.FC = () => {
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('paraboloid');
  const [radius, setRadius] = useState(2.0);
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [fieldPreset, setFieldPreset] = useState<'upward_uniform' | 'radial' | 'vortex' | 'diverging'>('upward_uniform');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showNormals, setShowNormals] = useState(true);

  const groupRef = useRef<THREE.Group | null>(null);
  const fluxParticlesRef = useRef<{
    geom: THREE.BufferGeometry;
    positions: Float32Array;
    velocities: Float32Array;
  } | null>(null);

  // Field Definition
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (fieldPreset) {
      case 'upward_uniform':
        return () => ({ x: 0, y: fieldStrength * 1.5, z: 0 });
      case 'radial':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.2;
          const factor = (fieldStrength * 2.0) / Math.pow(rSq, 1.2);
          return { x: factor * x, y: factor * y, z: factor * z };
        };
      case 'vortex':
        return (x, y, _z) => ({ x: -fieldStrength * y, y: fieldStrength * x, z: 0 });
      case 'diverging':
        return (x, y, z) => ({ x: fieldStrength * 0.8 * x, y: fieldStrength * 0.8 * y, z: fieldStrength * 0.8 * z });
    }
  }, [fieldPreset, fieldStrength]);

  // Numerical Flux Computation
  const fluxResult = useMemo(() => {
    return calculateSurfaceFlux(fieldFn, surfaceType, radius, 2.0, 30, 30);
  }, [fieldFn, surfaceType, radius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Re-build 3D Surface & Normal Vectors
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    fluxParticlesRef.current = null;

    let geom: THREE.BufferGeometry;

    if (surfaceType === 'disk') {
      geom = new THREE.CircleGeometry(radius, 40);
      geom.rotateX(-Math.PI / 2);
    } else if (surfaceType === 'paraboloid') {
      // Create paraboloid mesh
      const uSegs = 32;
      const vSegs = 32;
      const pos: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i <= uSegs; i++) {
        const r = (i / uSegs) * radius;
        for (let j = 0; j <= vSegs; j++) {
          const theta = (j / vSegs) * Math.PI * 2;
          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          const y = 2.0 * (1 - (r * r) / (radius * radius));
          pos.push(x, y, z);
        }
      }

      for (let i = 0; i < uSegs; i++) {
        for (let j = 0; j < vSegs; j++) {
          const a = i * (vSegs + 1) + j;
          const b = (i + 1) * (vSegs + 1) + j;
          const c = (i + 1) * (vSegs + 1) + (j + 1);
          const d = i * (vSegs + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
    } else if (surfaceType === 'sphere_cap') {
      geom = new THREE.SphereGeometry(radius, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    } else {
      geom = new THREE.CylinderGeometry(radius, radius, 2.5, 32, 1, true);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.4
    });

    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.4 });
    const wire = new THREE.Mesh(geom, wireMat);
    group.add(wire);

    // Normal vectors & sample flux arrows
    if (showNormals) {
      const up = new THREE.Vector3(0, 1, 0);
      const arrowCone = new THREE.ConeGeometry(0.04, 0.15, 8);
      const arrowStem = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6);
      const nMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.5 });

      // Draw a subset of normal vectors across surface
      const step = Math.max(1, Math.floor(fluxResult.samples.length / 45));
      for (let i = 0; i < fluxResult.samples.length; i += step) {
        const s = fluxResult.samples[i];
        const arrow = new THREE.Group();
        arrow.position.set(s.point.x, s.point.y, s.point.z);

        const stem = new THREE.Mesh(arrowStem, nMat);
        stem.position.y = 0.18;
        const cone = new THREE.Mesh(arrowCone, nMat);
        cone.position.y = 0.38;

        arrow.add(stem);
        arrow.add(cone);
        arrow.quaternion.setFromUnitVectors(up, new THREE.Vector3(s.normal.x, s.normal.y, s.normal.z));
        group.add(arrow);
      }
    }

    // Animated flux particles traversing through surface
    const pCount = 350;
    const pPos = new Float32Array(pCount * 3);
    const pVel = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 4;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xec4899,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeom, pMat);
    group.add(particles);

    fluxParticlesRef.current = { geom: pGeom, positions: pPos, velocities: pVel };
  }, [surfaceType, radius, showNormals, fluxResult]);

  // Animation Loop
  const handleAnimate = (delta: number) => {
    if (!isPlaying || !fluxParticlesRef.current) return;
    const { geom, positions } = fluxParticlesRef.current;
    const count = positions.length / 3;
    const dt = delta * 2.0;

    for (let i = 0; i < count; i++) {
      let px = positions[i * 3];
      let py = positions[i * 3 + 1];
      let pz = positions[i * 3 + 2];

      const f = fieldFn(px, py, pz);
      px += f.x * dt;
      py += f.y * dt;
      pz += f.z * dt;

      if (Math.abs(px) > 3.5 || Math.abs(py) > 3.5 || Math.abs(pz) > 3.5) {
        px = (Math.random() - 0.5) * 4;
        py = -2.0;
        pz = (Math.random() - 0.5) * 4;
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
            fieldTitle: `SURFACE FLUX: ${surfaceType.toUpperCase()}`,
            magnitude: `Flux Φ = ${fluxResult.totalFlux.toFixed(3)} Wb`,
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
            </div>
          }
        />
      </div>

      {/* Controls & Math */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>3D Surface Geometry S</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'paraboloid', label: 'Paraboloid Cap' },
              { id: 'sphere_cap', label: 'Hemisphere Cap' },
              { id: 'disk', label: 'Flat Disk' },
              { id: 'cylinder_side', label: 'Cylinder Wall' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSurfaceType(item.id as SurfaceType)}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  surfaceType === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-orbitron text-purple-400 font-semibold uppercase tracking-wider pt-2 flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>Vector Field Preset</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'upward_uniform', label: 'Upward (0, 1.5, 0)' },
              { id: 'radial', label: 'Radial (Coulomb)' },
              { id: 'diverging', label: 'Diverging (x, y, z)' },
              { id: 'vortex', label: 'Vortex (-y, x, 0)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFieldPreset(item.id as any)}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  fieldPreset === item.id
                    ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Surface Radius</span>
              <span className="font-mono text-cyan-300 font-semibold">{radius.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.2"
              value={radius}
              onChange={(e) => setRadius(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showNormals}
                onChange={(e) => setShowNormals(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-0"
              />
              Show Unit Normal Vectors n̂
            </label>
          </div>
        </div>

        {/* Calculation Panel */}
        <CalculationPanel
          title="Surface Flux Integral"
          formulaLatex="\Phi = \iint_S \mathbf{F} \cdot \hat{\mathbf{n}} \, dS = \iint_D \mathbf{F}(\mathbf{r}(u,v)) \cdot \left(\frac{\partial \mathbf{r}}{\partial u} \times \frac{\partial \mathbf{r}}{\partial v}\right) du \, dv"
          inputs={[
            { label: 'Surface', value: surfaceType.toUpperCase() },
            { label: 'Field', value: fieldPreset.toUpperCase() },
            { label: 'Radius R', value: radius.toFixed(1), unit: 'm' }
          ]}
          steps={[
            `\\text{1. Parameterize surface } \\mathbf{r}(u, v)`,
            `\\text{2. Compute fundamental normal vector } \\mathbf{N} = \\mathbf{r}_u \\times \\mathbf{r}_v`,
            `\\text{3. Form scalar flux product } \\mathbf{F}(\\mathbf{r}(u,v)) \\cdot \\mathbf{N}`,
            `\\text{4. Integrate over parameter domain } D: \\text{Total Flux } = ${fluxResult.totalFlux.toFixed(4)}`
          ]}
          resultLatex={`\\Phi = \\iint_S \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS = ${fluxResult.totalFlux.toFixed(4)}`}
          physicalMeaning="Surface integrals calculate the net flux of vector field passing through a 2D surface in 3D space, fundamental to Gauss's Laws for electricity and magnetism."
        />
      </div>
    </div>
  );
};

export default SurfaceIntegralView;
