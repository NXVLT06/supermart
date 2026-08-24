import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { 
  VectorFieldFn, 
  calculateLineIntegral, 
  Vec3, 
  vDot, 
  vNorm 
} from '../utils/mathEngine';
import { Play, Pause, RotateCcw, Sliders, Waypoints, Compass, Layers } from 'lucide-react';

export type CurveType = 'circle' | 'helix' | 'straight_line' | 'spiral';

export const LineIntegralView: React.FC = () => {
  const [curveType, setCurveType] = useState<CurveType>('circle');
  const [radius, setRadius] = useState(2.0);
  const [fieldStrength, setFieldStrength] = useState(1.0);
  const [fieldPreset, setFieldPreset] = useState<'vortex' | 'uniform' | 'radial' | 'saddle'>('vortex');
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [progressT, setProgressT] = useState(0);

  const groupRef = useRef<THREE.Group | null>(null);
  const particleMeshRef = useRef<THREE.Mesh | null>(null);
  const tangentArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const fieldArrowRef = useRef<THREE.ArrowHelper | null>(null);

  // Field Definition
  const fieldFn: VectorFieldFn = useMemo(() => {
    switch (fieldPreset) {
      case 'vortex':
        return (x, y) => ({ x: -fieldStrength * y, y: fieldStrength * x, z: 0 });
      case 'uniform':
        return () => ({ x: fieldStrength * 1.5, y: fieldStrength * 0.5, z: 0 });
      case 'radial':
        return (x, y, z) => ({ x: fieldStrength * x * 0.5, y: fieldStrength * y * 0.5, z: fieldStrength * z * 0.5 });
      case 'saddle':
        return (x, y) => ({ x: fieldStrength * x, y: -fieldStrength * y, z: 0 });
    }
  }, [fieldPreset, fieldStrength]);

  // Curve Parameterization r(t) for t in [0, 1]
  const curveFn = useMemo(() => {
    return (t: number): Vec3 => {
      switch (curveType) {
        case 'circle': {
          const angle = t * 2 * Math.PI;
          return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 };
        }
        case 'helix': {
          const angle = t * 4 * Math.PI;
          return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: (t - 0.5) * 3.0 };
        }
        case 'straight_line': {
          return { x: (t - 0.5) * 2 * radius, y: (t - 0.5) * radius, z: 0 };
        }
        case 'spiral': {
          const r = radius * (0.3 + 0.7 * t);
          const angle = t * 4 * Math.PI;
          return { x: r * Math.cos(angle), y: r * Math.sin(angle), z: (t - 0.5) * 1.5 };
        }
      }
    };
  }, [curveType, radius]);

  // Numerical Integration Calculation
  const lineIntegralResult = useMemo(() => {
    return calculateLineIntegral(fieldFn, curveFn, 0, 1, 300);
  }, [fieldFn, curveFn]);

  // Setup 3D Scene
  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;
  };

  // Build Curve Geometry & Ambient Field Vectors
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // 1. Draw 3D glowing path curve
    const pointsCount = 300;
    const curvePoints: THREE.Vector3[] = [];
    const colors: number[] = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const pt = curveFn(t);
      curvePoints.push(new THREE.Vector3(pt.x, pt.y, pt.z));

      // Color code by local F · dr dot product
      const f = fieldFn(pt.x, pt.y, pt.z);
      const nextPt = curveFn(Math.min(1, t + 0.01));
      const dr = { x: nextPt.x - pt.x, y: nextPt.y - pt.y, z: nextPt.z - pt.z };
      const dot = vDot(f, dr);

      const color = dot > 0 ? new THREE.Color(0x10b981) : dot < 0 ? new THREE.Color(0xef4444) : new THREE.Color(0x00f0ff);
      colors.push(color.r, color.g, color.b);
    }

    const curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
    curveGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const curveMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });

    const curveLine = new THREE.Line(curveGeom, curveMat);
    group.add(curveLine);

    // 2. Add glowing particle beads along curve
    const pMeshGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const pMeshMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8
    });
    const movingParticle = new THREE.Mesh(pMeshGeom, pMeshMat);
    group.add(movingParticle);
    particleMeshRef.current = movingParticle;

    // 3. Tangent Arrow (Cyan) and Field Arrow (Magenta)
    const tArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 0.8, 0x00f0ff, 0.2, 0.1);
    const fArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.8, 0xec4899, 0.2, 0.1);
    group.add(tArrow);
    group.add(fArrow);
    tangentArrowRef.current = tArrow;
    fieldArrowRef.current = fArrow;

    // 4. Background vector field arrows
    const arrowGeom = new THREE.ConeGeometry(0.04, 0.15, 8);
    const stemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6);
    const bMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.35 });
    const up = new THREE.Vector3(0, 1, 0);

    for (let x = -3; x <= 3; x += 1.5) {
      for (let y = -3; y <= 3; y += 1.5) {
        const f = fieldFn(x, y, 0);
        const mag = vNorm(f);
        if (mag < 0.1) continue;

        const dir = new THREE.Vector3(f.x, f.y, f.z).normalize();
        const arrow = new THREE.Group();
        arrow.position.set(x, y, 0);

        const stem = new THREE.Mesh(stemGeom, bMat);
        stem.position.y = 0.2;
        const cone = new THREE.Mesh(arrowGeom, bMat);
        cone.position.y = 0.4;

        arrow.add(stem);
        arrow.add(cone);
        arrow.quaternion.setFromUnitVectors(up, dir);
        group.add(arrow);
      }
    }
  }, [curveFn, fieldFn]);

  // Animation Loop: Move particle along curve
  const handleAnimate = (delta: number) => {
    if (!isPlaying) return;

    setProgressT((prev) => {
      let next = prev + delta * speed * 0.25;
      if (next > 1) next = 0;

      const pt = curveFn(next);
      const nextPt = curveFn(Math.min(1, next + 0.01));

      if (particleMeshRef.current) {
        particleMeshRef.current.position.set(pt.x, pt.y, pt.z);
      }

      const drVec = new THREE.Vector3(nextPt.x - pt.x, nextPt.y - pt.y, nextPt.z - pt.z).normalize();
      if (tangentArrowRef.current) {
        tangentArrowRef.current.position.set(pt.x, pt.y, pt.z);
        tangentArrowRef.current.setDirection(drVec);
      }

      const f = fieldFn(pt.x, pt.y, pt.z);
      const fMag = vNorm(f);
      const fVec = fMag > 0.01 ? new THREE.Vector3(f.x, f.y, f.z).normalize() : new THREE.Vector3(0, 1, 0);

      if (fieldArrowRef.current) {
        fieldArrowRef.current.position.set(pt.x, pt.y, pt.z);
        fieldArrowRef.current.setDirection(fVec);
        fieldArrowRef.current.setLength(Math.min(1.2, Math.max(0.4, fMag * 0.4)));
      }

      return next;
    });
  };

  // Cumulative work up to current t
  const currentAccumulation = useMemo(() => {
    const samples = lineIntegralResult.samples;
    const idx = Math.min(samples.length - 1, Math.floor(progressT * (samples.length - 1)));
    return samples[idx]?.cumulative || 0;
  }, [lineIntegralResult, progressT]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `LINE INTEGRAL: ${curveType.toUpperCase()}`,
            magnitude: `Work W = ${currentAccumulation.toFixed(3)} J`,
            status: isPlaying ? 'PARTICLE MOVING' : 'PAUSED'
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
                onClick={() => setProgressT(0)}
                className="p-2 rounded-md bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" /> Reset Path
              </button>
            </div>
          }
        />
      </div>

      {/* Controls & Math Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Curve & Field Config */}
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Waypoints className="w-4 h-4" />
            <span>Path Curve C</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'circle', label: 'Closed Circle' },
              { id: 'helix', label: '3D Helix' },
              { id: 'straight_line', label: 'Line Segment' },
              { id: 'spiral', label: 'Expanding Spiral' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurveType(item.id as CurveType);
                  setProgressT(0);
                }}
                className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  curveType === item.id
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
            <span>Vector Field F</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'vortex', label: 'Vortex (-y, x, 0)' },
              { id: 'uniform', label: 'Uniform (1.5, 0.5, 0)' },
              { id: 'radial', label: 'Radial (x, y, z)' },
              { id: 'saddle', label: 'Saddle (x, -y, 0)' }
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

          {/* Numeric Inputs */}
          <div className="space-y-4 pt-2">
            <NumericInput
              label="Curve Radius / Scale"
              value={radius}
              min={0.5}
              max={4.0}
              step={0.1}
              unit="m"
              color="cyan"
              onChange={setRadius}
            />
            <NumericInput
              label="Particle Traversal Speed"
              value={speed}
              min={0.1}
              max={5.0}
              step={0.1}
              unit="×"
              color="purple"
              onChange={setSpeed}
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

        {/* Legend */}
        <div className="glass-panel p-3 rounded-xl border-slate-800 text-xs flex items-center justify-around font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Tangent dr</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-slate-300">Field F</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Work &gt; 0</span>
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Line Integral Results"
          lawName="W = ∫_C F·dr"
          results={[
            {
              label: 'Total Work W = ∫_C F·dr',
              value: lineIntegralResult.totalIntegral,
              unit: 'J',
              formula: '\\int_C \\mathbf{F} \\cdot d\\mathbf{r}',
              highlight: lineIntegralResult.totalIntegral >= 0 ? 'emerald' : 'red'
            },
            {
              label: 'Accumulated Work at t',
              value: currentAccumulation,
              unit: 'J',
              highlight: 'cyan'
            },
            {
              label: 'Path Progress t',
              value: progressT * 100,
              unit: '%',
              highlight: 'purple'
            },
            {
              label: 'Curve Arc Length',
              value: lineIntegralResult.samples.reduce((acc, s) => acc + vNorm(s.dr), 0),
              unit: 'm',
              highlight: 'amber'
            }
          ]}
        />

        {/* Calculation Panel */}
        <CalculationPanel
          title="Line Integral Formulation"
          formulaLatex="W = \int_C \mathbf{F} \cdot d\mathbf{r} = \int_{a}^{b} \mathbf{F}(\mathbf{r}(t)) \cdot \mathbf{r}'(t) \, dt"
          inputs={[
            { label: 'Path Type', value: curveType.toUpperCase() },
            { label: 'Field Type', value: fieldPreset.toUpperCase() },
            { label: 'Scale R', value: radius.toFixed(1), unit: 'm' },
            { label: 'Progress t', value: `${(progressT * 100).toFixed(0)}%` }
          ]}
          steps={[
            `\\text{1. Parameterize curve } \\mathbf{r}(t) \\text{ for } t \\in [0, 1]`,
            `\\text{2. Compute tangent velocity } \\mathbf{r}'(t) = \\frac{d\\mathbf{r}}{dt}`,
            `\\text{3. Form scalar product } \\mathbf{F}(\\mathbf{r}(t)) \\cdot \\mathbf{r}'(t)`,
            `\\text{4. Integrate along path } C: \\text{Accumulated Work } = ${currentAccumulation.toFixed(4)}`
          ]}
          resultLatex={`\\int_C \\mathbf{F} \\cdot d\\mathbf{r} = ${lineIntegralResult.totalIntegral.toFixed(4)}`}
          physicalMeaning="The line integral calculates total work done by force field F along path C, or the circulation of velocity/magnetic field around a curve."
        />
      </div>
    </div>
  );
};

export default LineIntegralView;
