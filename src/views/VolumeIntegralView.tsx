import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { ScalarFieldFn, calculateVolumeIntegral } from '../utils/mathEngine';
import { Box, Layers, Play, Pause, Sliders, Sparkles } from 'lucide-react';

export type VolumeShape = 'sphere' | 'cube' | 'cylinder';

export const VolumeIntegralView: React.FC = () => {
  const [shape, setShape] = useState<VolumeShape>('sphere');
  const [size, setSize] = useState(2.0);
  const [densityPreset, setDensityPreset] = useState<'constant' | 'gaussian' | 'radial_sq' | 'linear_z'>('gaussian');
  const [isPlaying, setIsPlaying] = useState(true);
  const [voxelRes, setVoxelRes] = useState(18);

  const groupRef = useRef<THREE.Group | null>(null);

  // Scalar Density Function f(x,y,z)
  const scalarDensity: ScalarFieldFn = useMemo(() => {
    switch (densityPreset) {
      case 'constant':
        return () => 1.0;
      case 'gaussian':
        return (x, y, z) => 3.0 * Math.exp(-(x * x + y * y + z * z) / 2.0);
      case 'radial_sq':
        return (x, y, z) => 0.5 * (x * x + y * y + z * z);
      case 'linear_z':
        return (_x, _y, z) => z + 2.0;
    }
  }, [densityPreset]);

  // Numerical Volume Integral
  const volumeResult = useMemo(() => {
    return calculateVolumeIntegral(scalarDensity, shape, size, voxelRes);
  }, [scalarDensity, shape, size, voxelRes]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Re-render 3D Voxel Points & Volume Boundary
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // 1. Boundary wireframe mesh
    let boundGeom: THREE.BufferGeometry;
    if (shape === 'sphere') {
      boundGeom = new THREE.SphereGeometry(size, 24, 24);
    } else if (shape === 'cube') {
      boundGeom = new THREE.BoxGeometry(size * 2, size * 2, size * 2);
    } else {
      boundGeom = new THREE.CylinderGeometry(size, size, size * 2, 24);
    }

    const boundMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const boundMesh = new THREE.Mesh(boundGeom, boundMat);
    group.add(boundMesh);

    // 2. 3D Voxel density particles
    const step = (2 * size) / voxelRes;
    const pos: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < voxelRes; i++) {
      const x = -size + (i + 0.5) * step;
      for (let j = 0; j < voxelRes; j++) {
        const y = -size + (j + 0.5) * step;
        for (let k = 0; k < voxelRes; k++) {
          const z = -size + (k + 0.5) * step;

          let inside = false;
          if (shape === 'sphere') {
            inside = (x * x + y * y + z * z) <= size * size;
          } else if (shape === 'cube') {
            inside = Math.abs(x) <= size && Math.abs(y) <= size && Math.abs(z) <= size;
          } else if (shape === 'cylinder') {
            inside = (x * x + y * y) <= size * size && Math.abs(z) <= size;
          }

          if (inside) {
            pos.push(x, y, z);
            const val = scalarDensity(x, y, z);
            const norm = THREE.MathUtils.clamp(val / 3.0, 0, 1);
            const col = new THREE.Color().setHSL(0.65 - norm * 0.65, 1.0, 0.55);
            colors.push(col.r, col.g, col.b);
          }
        }
      }
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const voxels = new THREE.Points(pGeom, pMat);
    group.add(voxels);
  }, [shape, size, scalarDensity, voxelRes]);

  const handleAnimate = (delta: number) => {
    if (!isPlaying || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.15;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `VOLUME INTEGRAL: ${shape.toUpperCase()}`,
            magnitude: `Volume Value = ${volumeResult.totalIntegral.toFixed(3)}`,
            particleCount: volumeResult.sampleCount,
            status: isPlaying ? 'ROTATING' : 'PAUSED'
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
            <Box className="w-4 h-4" />
            <span>3D Domain Geometry V</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'sphere', label: 'Solid Sphere' },
              { id: 'cube', label: 'Solid Cube' },
              { id: 'cylinder', label: 'Solid Cylinder' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setShape(item.id as VolumeShape)}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  shape === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-orbitron text-purple-400 font-semibold uppercase tracking-wider pt-2 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>Scalar Density Field f(x,y,z)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'gaussian', label: 'Gaussian Density' },
              { id: 'radial_sq', label: 'Quadratic r²' },
              { id: 'linear_z', label: 'Linear z + 2' },
              { id: 'constant', label: 'Uniform (f = 1)' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setDensityPreset(item.id as any)}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  densityPreset === item.id
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
              <span className="text-slate-400">Volume Dimension Size</span>
              <span className="font-mono text-cyan-300 font-semibold">{size.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.2"
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Calculation Panel */}
        <CalculationPanel
          title="Volume Integral Riemann Sum"
          formulaLatex="I = \iiint_V f(x,y,z) \, dV = \lim_{\Delta V \to 0} \sum_{i} f(x_i, y_i, z_i) \Delta V"
          inputs={[
            { label: 'Domain', value: shape.toUpperCase() },
            { label: 'Density', value: densityPreset.toUpperCase() },
            { label: 'Voxel Samples', value: volumeResult.sampleCount }
          ]}
          steps={[
            `\\text{1. Discretize domain } V \\text{ into 3D voxel grid } \\Delta V = \\Delta x \\Delta y \\Delta z`,
            `\\text{2. Evaluate scalar density function } f(x_i, y_i, z_i) \\text{ for all inside voxels}`,
            `\\text{3. Aggregate volumetric Riemann sum across } ${volumeResult.sampleCount} \\text{ voxels}`,
            `\\text{4. Total integrated volume value } = ${volumeResult.totalIntegral.toFixed(4)}`
          ]}
          resultLatex={`\\iiint_V f \\, dV = ${volumeResult.totalIntegral.toFixed(4)}`}
          physicalMeaning="Volume integrals compute total mass from mass density, total charge Q = ∭ ρ dV from charge density, or the volumetric divergence sum in Gauss's Theorem."
        />
      </div>
    </div>
  );
};

export default VolumeIntegralView;
