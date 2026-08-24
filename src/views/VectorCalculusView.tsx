import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { 
  ScalarFieldFn, 
  VectorFieldFn, 
  computeGradient, 
  computeDivergence, 
  computeCurl, 
  vNorm 
} from '../utils/mathEngine';
import { 
  Layers, 
  Activity, 
  RotateCw, 
  Compass, 
  Maximize2, 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export type CalculusMode = 'gradient' | 'divergence' | 'curl';

export const VectorCalculusView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalculusMode>('gradient');

  // Gradient options
  const [gradPreset, setGradPreset] = useState<'gaussian' | 'paraboloid' | 'saddle' | 'ripple'>('gaussian');
  
  // Divergence options
  const [divPreset, setDivPreset] = useState<'source' | 'sink' | 'solenoidal' | 'mixed'>('source');
  
  // Curl options
  const [curlPreset, setCurlPreset] = useState<'pure_vortex' | 'shear' | 'irrotational' | 'whirlpool'>('pure_vortex');

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);

  // Three.js groups
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const paddleWheelRef = useRef<THREE.Group | null>(null);
  const divergenceParticlesRef = useRef<{
    geom: THREE.BufferGeometry;
    positions: Float32Array;
    velocities: Float32Array;
    origins: Float32Array;
  } | null>(null);

  // Scalar Field for Gradient
  const scalarField: ScalarFieldFn = useMemo(() => {
    switch (gradPreset) {
      case 'gaussian':
        return (x, y) => 2.5 * Math.exp(-(x * x + y * y) / 2.0);
      case 'paraboloid':
        return (x, y) => 0.3 * (x * x + y * y);
      case 'saddle':
        return (x, y) => 0.4 * (x * x - y * y);
      case 'ripple':
        return (x, y) => Math.sin(1.5 * x) * Math.cos(1.5 * y) + 1.0;
    }
  }, [gradPreset]);

  // Vector Field for Divergence
  const divField: VectorFieldFn = useMemo(() => {
    switch (divPreset) {
      case 'source':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.3;
          const factor = 2.0 / Math.pow(rSq, 1.2);
          return { x: factor * x, y: factor * y, z: factor * z };
        };
      case 'sink':
        return (x, y, z) => {
          const rSq = x * x + y * y + z * z + 0.3;
          const factor = -2.0 / Math.pow(rSq, 1.2);
          return { x: factor * x, y: factor * y, z: factor * z };
        };
      case 'solenoidal':
        // Div = 0
        return (x, y, _z) => ({ x: -y, y: x, z: 0 });
      case 'mixed':
        return (x, y, z) => ({ x: 1.2 * x, y: -0.6 * y, z: -0.6 * z });
    }
  }, [divPreset]);

  // Vector Field for Curl
  const curlField: VectorFieldFn = useMemo(() => {
    switch (curlPreset) {
      case 'pure_vortex':
        return (x, y, _z) => ({ x: -1.5 * y, y: 1.5 * x, z: 0 });
      case 'shear':
        return (_x, y, _z) => ({ x: 1.5 * y, y: 0, z: 0 });
      case 'irrotational':
        return (x, y, z) => ({ x: x, y: y, z: z });
      case 'whirlpool':
        return (x, y, z) => {
          const rSq = x * x + y * y + 0.2;
          return { x: -y / rSq - 0.3 * x, y: x / rSq - 0.3 * y, z: -0.4 * z };
        };
    }
  }, [curlPreset]);

  // Telemetry
  const probeGrad = useMemo(() => computeGradient(scalarField, 1.0, 1.0, 0), [scalarField]);
  const probeDiv = useMemo(() => computeDivergence(divField, 1.0, 1.0, 0), [divField]);
  const probeCurl = useMemo(() => computeCurl(curlField, 1.0, 1.0, 0), [curlField]);

  // 3D Scene Setup
  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    dynamicGroupRef.current = group;
  };

  // Re-build 3D visual representation whenever mode or preset changes
  useEffect(() => {
    if (!dynamicGroupRef.current) return;
    const group = dynamicGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    paddleWheelRef.current = null;
    divergenceParticlesRef.current = null;

    if (activeTab === 'gradient') {
      // 1. 3D Terrain Surface for Scalar Potential
      const size = 6.0;
      const res = 48;
      const geom = new THREE.PlaneGeometry(size, size, res, res);
      geom.rotateX(-Math.PI / 2);

      const pos = geom.attributes.position;
      const colors = new Float32Array(pos.count * 3);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = scalarField(x, z, 0);
        pos.setY(i, y);

        // Heatmap color: Blue -> Cyan -> Purple -> Red
        const normY = THREE.MathUtils.clamp((y + 1) / 3.5, 0, 1);
        const col = new THREE.Color().setHSL(0.65 - normY * 0.65, 1.0, 0.5);
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.2,
        side: THREE.DoubleSide,
        wireframe: false
      });

      const mesh = new THREE.Mesh(geom, mat);
      group.add(mesh);

      // Wireframe overlay for futuristic look
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.15 });
      const wireMesh = new THREE.Mesh(geom, wireMat);
      group.add(wireMesh);

      // Gradient vector arrows on surface pointing in direction of maximum ascent
      const arrowCone = new THREE.ConeGeometry(0.06, 0.2, 8);
      const arrowStem = new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.4 });
      const up = new THREE.Vector3(0, 1, 0);

      const arrowStep = 0.85;
      for (let x = -2.2; x <= 2.2; x += arrowStep) {
        for (let z = -2.2; z <= 2.2; z += arrowStep) {
          const y = scalarField(x, z, 0);
          const grad = computeGradient(scalarField, x, z, 0);
          const gNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);
          if (gNorm < 0.05) continue;

          // Gradient vector lies tangent to surface: (df/dx, df/dx*df/dx+df/dz*df/dz, df/dz)
          const dir = new THREE.Vector3(grad.x, gNorm * 0.8, grad.y).normalize();

          const arrow = new THREE.Group();
          arrow.position.set(x, y + 0.1, z);

          const stem = new THREE.Mesh(arrowStem, arrowMat);
          stem.position.y = 0.22;
          const cone = new THREE.Mesh(arrowCone, arrowMat);
          cone.position.y = 0.45;

          arrow.add(stem);
          arrow.add(cone);
          arrow.quaternion.setFromUnitVectors(up, dir);
          group.add(arrow);
        }
      }
    } else if (activeTab === 'divergence') {
      // 2. Divergence Particle Outflow / Inflow System
      const count = 600;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const origins = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        // Initial random spherical distribution
        const r = Math.cbrt(Math.random()) * 2.8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        origins[i * 3] = x;
        origins[i * 3 + 1] = y;
        origins[i * 3 + 2] = z;

        const isSource = divPreset === 'source';
        colors[i * 3] = isSource ? 0.0 : 1.0;
        colors[i * 3 + 1] = isSource ? 0.94 : 0.2;
        colors[i * 3 + 2] = isSource ? 1.0 : 0.3;
      }

      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const pMat = new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(pGeom, pMat);
      group.add(particles);

      divergenceParticlesRef.current = { geom: pGeom, positions, velocities, origins };

      // Central source/sink glowing sphere
      const sphereGeom = new THREE.SphereGeometry(0.3, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: divPreset === 'source' ? 0x00f0ff : 0xef4444,
        emissive: divPreset === 'source' ? 0x00f0ff : 0xef4444,
        emissiveIntensity: 0.8,
        wireframe: true
      });
      const centralSphere = new THREE.Mesh(sphereGeom, sphereMat);
      group.add(centralSphere);
    } else if (activeTab === 'curl') {
      // 3. Curl Vortex & Animated Test Paddle Wheel
      const arrowCone = new THREE.ConeGeometry(0.06, 0.2, 10);
      const arrowStem = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.35 });
      const up = new THREE.Vector3(0, 1, 0);

      // Grid of rotating field vectors
      for (let x = -2.5; x <= 2.5; x += 1.0) {
        for (let y = -2.5; y <= 2.5; y += 1.0) {
          const f = curlField(x, y, 0);
          const mag = vNorm(f);
          if (mag < 0.05) continue;

          const dir = new THREE.Vector3(f.x, f.y, f.z).normalize();
          const arrow = new THREE.Group();
          arrow.position.set(x, y, 0);

          const stem = new THREE.Mesh(arrowStem, arrowMat);
          stem.position.y = 0.25;
          const cone = new THREE.Mesh(arrowCone, arrowMat);
          cone.position.y = 0.5;

          arrow.add(stem);
          arrow.add(cone);
          arrow.quaternion.setFromUnitVectors(up, dir);
          group.add(arrow);
        }
      }

      // Interactive Test Paddle Wheel
      const paddleGroup = new THREE.Group();
      paddleGroup.position.set(0, 0, 0.1);

      // Central axle
      const axleGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16);
      const axleMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8 });
      const axle = new THREE.Mesh(axleGeom, axleMat);
      axle.rotateX(Math.PI / 2);
      paddleGroup.add(axle);

      // 4 Blades of Paddle Wheel
      for (let i = 0; i < 4; i++) {
        const bladeGeom = new THREE.BoxGeometry(0.6, 0.04, 0.2);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x00f0ff : 0xec4899,
          roughness: 0.2,
          emissive: i % 2 === 0 ? 0x00f0ff : 0xec4899,
          emissiveIntensity: 0.3
        });
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.x = 0.35;
        const bladeWrapper = new THREE.Group();
        bladeWrapper.rotateZ((i * Math.PI) / 2);
        bladeWrapper.add(blade);
        paddleGroup.add(bladeWrapper);
      }

      group.add(paddleGroup);
      paddleWheelRef.current = paddleGroup;
    }
  }, [activeTab, gradPreset, divPreset, curlPreset, scalarField, divField, curlField]);

  // Animation Frame
  const handleAnimate = (delta: number) => {
    if (!isPlaying) return;

    // Divergence particle flow animation
    if (activeTab === 'divergence' && divergenceParticlesRef.current) {
      const { geom, positions, origins } = divergenceParticlesRef.current;
      const count = positions.length / 3;
      const dt = delta * speed * 2.0;

      for (let i = 0; i < count; i++) {
        let px = positions[i * 3];
        let py = positions[i * 3 + 1];
        let pz = positions[i * 3 + 2];

        const f = divField(px, py, pz);
        px += f.x * dt;
        py += f.y * dt;
        pz += f.z * dt;

        const dist = Math.sqrt(px * px + py * py + pz * pz);
        if (divPreset === 'source' && dist > 3.5) {
          // Re-emit near center
          px = (Math.random() - 0.5) * 0.4;
          py = (Math.random() - 0.5) * 0.4;
          pz = (Math.random() - 0.5) * 0.4;
        } else if (divPreset === 'sink' && dist < 0.2) {
          // Re-emit far outside
          px = origins[i * 3];
          py = origins[i * 3 + 1];
          pz = origins[i * 3 + 2];
        }

        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;
      }
      (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // Curl paddle wheel rotation animation
    if (activeTab === 'curl' && paddleWheelRef.current) {
      // Angular velocity omega = 0.5 * (curl F)_z
      const curlAtOrigin = computeCurl(curlField, 0, 0, 0);
      const omega = 0.5 * curlAtOrigin.z * speed * 3.0;
      paddleWheelRef.current.rotation.z += omega * delta;
    }
  };

  const getFormulaLatex = () => {
    if (activeTab === 'gradient') {
      return `\\nabla f(x,y,z) = \\frac{\\partial f}{\\partial x}\\hat{\\mathbf{i}} + \\frac{\\partial f}{\\partial y}\\hat{\\mathbf{j}} + \\frac{\\partial f}{\\partial z}\\hat{\\mathbf{k}}`;
    } else if (activeTab === 'divergence') {
      return `\\nabla \\cdot \\mathbf{F} = \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} + \\frac{\\partial R}{\\partial z}`;
    } else {
      return `\\nabla \\times \\mathbf{F} = \\left(\\frac{\\partial R}{\\partial y}-\\frac{\\partial Q}{\\partial z}\\right)\\hat{\\mathbf{i}} + \\left(\\frac{\\partial P}{\\partial z}-\\frac{\\partial R}{\\partial x}\\right)\\hat{\\mathbf{j}} + \\left(\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}\\right)\\hat{\\mathbf{k}}`;
    }
  };

  const getPhysicalMeaning = () => {
    if (activeTab === 'gradient') {
      return "The Gradient transforms a scalar field into a vector field pointing in the direction of steepest ascent, with magnitude equal to the rate of increase. In physics, electric field E = -∇V.";
    } else if (activeTab === 'divergence') {
      return "Divergence measures the net flux of vector field exiting an infinitesimal volume around a point (source if > 0, sink if < 0, solenoidal/incompressible if = 0). Gauss' Law ∇·E = ρ/ε0.";
    } else {
      return "Curl measures the microscopic rotational circulation density of the field. A test paddle wheel placed at the location spins with angular velocity ω = ½ ∇×F. Faraday's Law ∇×E = -∂B/∂t.";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-5rem)] p-4">
      {/* 3D Viewport Column */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
        <ThreeViewport
          onSetup={handleSetup}
          onAnimate={handleAnimate}
          hudInfo={{
            fieldTitle: `VECTOR CALCULUS: ${activeTab.toUpperCase()}`,
            magnitude: activeTab === 'gradient' 
              ? `|∇f| = ${vNorm(probeGrad).toFixed(2)}` 
              : activeTab === 'divergence' 
                ? `∇·F = ${probeDiv.toFixed(2)}` 
                : `|∇×F| = ${vNorm(probeCurl).toFixed(2)}`,
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

      {/* Controls & Math Column */}
      <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Navigation Tabs */}
        <div className="flex items-center p-1 glass-panel rounded-xl border-cyan-500/30">
          {(['gradient', 'divergence', 'curl'] as CalculusMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-orbitron font-semibold rounded-lg capitalize transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Preset Sub-Options */}
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>{activeTab} Configurations</span>
          </div>

          {activeTab === 'gradient' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'gaussian', label: 'Gaussian Peak' },
                { id: 'paraboloid', label: 'Paraboloid Bowl' },
                { id: 'saddle', label: 'Saddle Surface' },
                { id: 'ripple', label: 'Periodic Ripple' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setGradPreset(item.id as any)}
                  className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    gradPreset === item.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'divergence' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'source', label: 'Positive Source (∇·F > 0)' },
                { id: 'sink', label: 'Negative Sink (∇·F < 0)' },
                { id: 'solenoidal', label: 'Solenoidal (∇·F = 0)' },
                { id: 'mixed', label: 'Mixed Expansion' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDivPreset(item.id as any)}
                  className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    divPreset === item.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'pure_vortex', label: 'Rigid Body Vortex' },
                { id: 'shear', label: 'Shear Flow' },
                { id: 'irrotational', label: 'Irrotational (∇×F = 0)' },
                { id: 'whirlpool', label: 'Spiral Whirlpool' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurlPreset(item.id as any)}
                  className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    curlPreset === item.id
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Speed Slider */}
          <div className="pt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Simulation Velocity</span>
              <span className="font-mono text-cyan-300 font-semibold">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Step-by-Step Mathematical Calculation Panel */}
        <CalculationPanel
          title={`Differential Operator: ${activeTab.toUpperCase()}`}
          formulaLatex={getFormulaLatex()}
          inputs={[
            { label: 'Operator', value: activeTab.toUpperCase() },
            { label: 'Preset', value: activeTab === 'gradient' ? gradPreset : activeTab === 'divergence' ? divPreset : curlPreset },
            { label: 'Evaluation Probe', value: '(1.0, 1.0, 0.0)' }
          ]}
          steps={
            activeTab === 'gradient'
              ? [
                  `\\text{1. Evaluate partial derivatives at }(x,y) = (1,1):`,
                  `\\frac{\\partial f}{\\partial x} = ${probeGrad.x.toFixed(4)}, \\; \\frac{\\partial f}{\\partial y} = ${probeGrad.y.toFixed(4)}`,
                  `\\text{2. Gradient vector: } \\nabla f = \\langle ${probeGrad.x.toFixed(4)}, ${probeGrad.y.toFixed(4)} \\rangle`,
                  `\\text{3. Steepest slope magnitude: } |\\nabla f| = ${vNorm(probeGrad).toFixed(4)}`
                ]
              : activeTab === 'divergence'
              ? [
                  `\\text{1. Compute coordinate flux divergence } \\nabla \\cdot \\mathbf{F}:`,
                  `\\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y} + \\frac{\\partial R}{\\partial z} = ${probeDiv.toFixed(4)}`,
                  probeDiv > 0.05
                    ? `\\text{2. } \\nabla \\cdot \\mathbf{F} > 0 \\implies \\text{Net positive outward volumetric flux (Source)}`
                    : probeDiv < -0.05
                    ? `\\text{2. } \\nabla \\cdot \\mathbf{F} < 0 \\implies \\text{Net inward volumetric flux (Sink)}`
                    : `\\text{2. } \\nabla \\cdot \\mathbf{F} = 0 \\implies \\text{Incompressible solenoidal field}`
                ]
              : [
                  `\\text{1. Compute 3D Curl } \\nabla \\times \\mathbf{F} \\text{ at probe point: }`,
                  `\\nabla \\times \\mathbf{F} = \\langle ${probeCurl.x.toFixed(3)}, ${probeCurl.y.toFixed(3)}, ${probeCurl.z.toFixed(3)} \\rangle`,
                  `\\text{2. Paddle wheel angular rotation vector: } \\boldsymbol{\\omega} = \\frac{1}{2}(\\nabla \\times \\mathbf{F})`,
                  `\\text{3. Rotation rate: } |\\boldsymbol{\\omega}| = ${(vNorm(probeCurl) / 2).toFixed(3)} \\text{ rad/s}`
                ]
          }
          resultLatex={
            activeTab === 'gradient'
              ? `|\\nabla f| = ${vNorm(probeGrad).toFixed(3)}`
              : activeTab === 'divergence'
              ? `\\nabla \\cdot \\mathbf{F} = ${probeDiv.toFixed(3)}`
              : `|\\nabla \\times \\mathbf{F}| = ${vNorm(probeCurl).toFixed(3)}`
          }
          physicalMeaning={getPhysicalMeaning()}
        />
      </div>
    </div>
  );
};

export default VectorCalculusView;
