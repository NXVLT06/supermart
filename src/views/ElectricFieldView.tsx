import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeViewport } from '../components/ThreeViewport';
import { CalculationPanel } from '../components/CalculationPanel';
import { NumericInput } from '../components/NumericInput';
import { ResultsPanel } from '../components/ResultsPanel';
import { 
  PointCharge, 
  computeElectricField, 
  computeElectricPotential, 
  vNorm 
} from '../utils/mathEngine';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Sliders, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';

export const ElectricFieldView: React.FC = () => {
  const [charges, setCharges] = useState<PointCharge[]>([
    { id: '1', x: -1.2, y: 0, z: 0, q: 2.0 },
    { id: '2', x: 1.2, y: 0, z: 0, q: -2.0 }
  ]);

  const [selectedChargeId, setSelectedChargeId] = useState<string>('1');
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showEquipotentials, setShowEquipotentials] = useState(true);
  const [showGaussianSurface, setShowGaussianSurface] = useState(true);
  const [gaussianRadius, setGaussianRadius] = useState(1.8);
  const [isPlaying, setIsPlaying] = useState(true);

  const groupRef = useRef<THREE.Group | null>(null);
  const chargesGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<{
    geom: THREE.BufferGeometry;
    positions: Float32Array;
  } | null>(null);

  // Selected charge
  const selectedCharge = charges.find((c) => c.id === selectedChargeId);

  // Add Charge
  const handleAddCharge = (q: number) => {
    const newCharge: PointCharge = {
      id: Math.random().toString(36).substring(2, 9),
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: 0,
      q
    };
    setCharges([...charges, newCharge]);
    setSelectedChargeId(newCharge.id);
  };

  // Remove Charge
  const handleRemoveCharge = (id: string) => {
    if (charges.length <= 1) return;
    const remaining = charges.filter((c) => c.id !== id);
    setCharges(remaining);
    setSelectedChargeId(remaining[0].id);
  };

  // Calculate Enclosed Charge in Gaussian Sphere centered at origin
  const enclosedCharge = useMemo(() => {
    return charges.reduce((acc, c) => {
      const dist = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
      return dist <= gaussianRadius ? acc + c.q : acc;
    }, 0);
  }, [charges, gaussianRadius]);

  // Numerical Gauss's Law Surface Flux Integration
  const numericalGaussFlux = useMemo(() => {
    const uSteps = 30;
    const vSteps = 30;
    const dPhi = Math.PI / uSteps;
    const dTheta = (2 * Math.PI) / vSteps;
    let totalFlux = 0;

    for (let i = 1; i <= uSteps; i++) {
      const phi = (i - 0.5) * dPhi;
      for (let j = 0; j < vSteps; j++) {
        const theta = j * dTheta;
        const x = gaussianRadius * Math.sin(phi) * Math.cos(theta);
        const y = gaussianRadius * Math.sin(phi) * Math.sin(theta);
        const z = gaussianRadius * Math.cos(phi);
        const normal = { x: x / gaussianRadius, y: y / gaussianRadius, z: z / gaussianRadius };
        const dS = gaussianRadius * gaussianRadius * Math.sin(phi) * dPhi * dTheta;

        const E = computeElectricField(charges, x, y, z);
        totalFlux += (E.x * normal.x + E.y * normal.y + E.z * normal.z) * dS;
      }
    }
    return totalFlux;
  }, [charges, gaussianRadius]);

  const handleSetup = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const cGroup = new THREE.Group();
    scene.add(cGroup);
    chargesGroupRef.current = cGroup;
  };

  // Build 3D Field Lines, Charge Spheres, Equipotentials, and Gaussian Box
  useEffect(() => {
    if (!groupRef.current || !chargesGroupRef.current) return;
    const group = groupRef.current;
    const cGroup = chargesGroupRef.current;

    while (group.children.length > 0) group.remove(group.children[0]);
    while (cGroup.children.length > 0) cGroup.remove(cGroup.children[0]);
    particlesRef.current = null;

    // 1. Draw Charge Spheres
    charges.forEach((c) => {
      const isPositive = c.q > 0;
      const colHex = isPositive ? 0xef4444 : 0x3b82f6;

      const sphereGeom = new THREE.SphereGeometry(0.22, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: colHex,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });
      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
      sphereMesh.position.set(c.x, c.y, c.z);

      // Glow halo ring
      const ringGeom = new THREE.RingGeometry(0.28, 0.34, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: colHex, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      sphereMesh.add(ringMesh);

      cGroup.add(sphereMesh);
    });

    // 2. Field Lines using Runge-Kutta 4 Integration radiating from positive charges
    if (showFieldLines) {
      const linesMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.7,
        linewidth: 1.5
      });

      charges.forEach((c) => {
        // Emit rays from positive charges (or negative if only negatives exist)
        const numRays = 16;
        for (let i = 0; i < numRays; i++) {
          const theta = (i / numRays) * Math.PI * 2;
          for (let p = 0; p < 3; p++) {
            const phi = ((p + 1) / 4) * Math.PI;

            let curX = c.x + 0.25 * Math.sin(phi) * Math.cos(theta);
            let curY = c.y + 0.25 * Math.sin(phi) * Math.sin(theta);
            let curZ = c.z + 0.25 * Math.cos(phi);

            const pathPoints: THREE.Vector3[] = [new THREE.Vector3(curX, curY, curZ)];
            const stepSize = 0.08;
            const maxSteps = 70;
            const sign = c.q > 0 ? 1 : -1;

            for (let s = 0; s < maxSteps; s++) {
              const E1 = computeElectricField(charges, curX, curY, curZ);
              const mag1 = vNorm(E1);
              if (mag1 < 0.02 || mag1 > 40) break;

              // RK4 Step
              const k1x = (E1.x / mag1) * stepSize * sign;
              const k1y = (E1.y / mag1) * stepSize * sign;
              const k1z = (E1.z / mag1) * stepSize * sign;

              const E2 = computeElectricField(charges, curX + k1x * 0.5, curY + k1y * 0.5, curZ + k1z * 0.5);
              const mag2 = vNorm(E2) || 1;
              const k2x = (E2.x / mag2) * stepSize * sign;
              const k2y = (E2.y / mag2) * stepSize * sign;
              const k2z = (E2.z / mag2) * stepSize * sign;

              curX += k2x;
              curY += k2y;
              curZ += k2z;

              pathPoints.push(new THREE.Vector3(curX, curY, curZ));

              // Terminate if close to any opposite charge
              let reachedOther = false;
              for (const other of charges) {
                if (other.id !== c.id) {
                  const d = Math.hypot(curX - other.x, curY - other.y, curZ - other.z);
                  if (d < 0.25) {
                    reachedOther = true;
                    break;
                  }
                }
              }
              if (reachedOther || Math.abs(curX) > 5 || Math.abs(curY) > 5 || Math.abs(curZ) > 5) break;
            }

            if (pathPoints.length > 2) {
              const lineGeom = new THREE.BufferGeometry().setFromPoints(pathPoints);
              const line = new THREE.Line(lineGeom, linesMat);
              group.add(line);
            }
          }
        }
      });
    }

    // 3. Equipotential Contour Heatmap in XY Plane
    if (showEquipotentials) {
      const planeGeom = new THREE.PlaneGeometry(8, 8, 48, 48);
      const pos = planeGeom.attributes.position;
      const colors = new Float32Array(pos.count * 3);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const pot = computeElectricPotential(charges, x, y, 0);

        // Normalize potential for color
        const norm = THREE.MathUtils.clamp((pot + 15) / 30, 0, 1);
        const col = new THREE.Color().setHSL(0.65 - norm * 0.65, 0.9, 0.45);
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }

      planeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const planeMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(planeGeom, planeMat);
      plane.position.z = -0.05;
      group.add(plane);
    }

    // 4. Gaussian Sphere Surface
    if (showGaussianSurface) {
      const gGeom = new THREE.SphereGeometry(gaussianRadius, 24, 24);
      const gMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      const gMesh = new THREE.Mesh(gGeom, gMat);
      group.add(gMesh);
    }

    // 5. Test Charge Particle Swarm
    const pCount = 300;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 6;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const testParticles = new THREE.Points(pGeom, pMat);
    group.add(testParticles);

    particlesRef.current = { geom: pGeom, positions: pPos };
  }, [charges, showFieldLines, showEquipotentials, showGaussianSurface, gaussianRadius]);

  // Particle flow along electric field lines
  const handleAnimate = (delta: number) => {
    if (!isPlaying || !particlesRef.current) return;
    const { geom, positions } = particlesRef.current;
    const count = positions.length / 3;
    const dt = delta * 2.5;

    for (let i = 0; i < count; i++) {
      let px = positions[i * 3];
      let py = positions[i * 3 + 1];
      let pz = positions[i * 3 + 2];

      const E = computeElectricField(charges, px, py, pz);
      const mag = vNorm(E);

      if (mag > 0.05) {
        px += (E.x / (mag + 0.5)) * dt;
        py += (E.y / (mag + 0.5)) * dt;
        pz += (E.z / (mag + 0.5)) * dt;
      }

      if (Math.abs(px) > 3.5 || Math.abs(py) > 3.5 || Math.abs(pz) > 3) {
        // Re-emit near positive charge
        const posCharges = charges.filter((c) => c.q > 0);
        const src = posCharges.length > 0 ? posCharges[Math.floor(Math.random() * posCharges.length)] : charges[0];
        px = src.x + (Math.random() - 0.5) * 0.4;
        py = src.y + (Math.random() - 0.5) * 0.4;
        pz = src.z + (Math.random() - 0.5) * 0.4;
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
            fieldTitle: `ELECTROSTATICS & GAUSS'S LAW`,
            magnitude: `Q_enc = ${enclosedCharge.toFixed(2)} nC | Φ_E = ${numericalGaussFlux.toFixed(2)}`,
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
        {/* Charge Manager */}
        <div className="glass-panel p-4 rounded-xl border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between text-xs font-orbitron text-cyan-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Point Charges ({charges.length})
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleAddCharge(2.0)}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded text-xs flex items-center gap-0.5"
                title="Add Positive Charge (+2 nC)"
              >
                <Plus className="w-3 h-3" /> +q
              </button>
              <button
                onClick={() => handleAddCharge(-2.0)}
                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded text-xs flex items-center gap-0.5"
                title="Add Negative Charge (-2 nC)"
              >
                <Minus className="w-3 h-3" /> -q
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {charges.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => setSelectedChargeId(c.id)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  selectedChargeId === c.id
                    ? 'bg-cyan-500/20 border-cyan-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      c.q > 0 ? 'bg-red-500 shadow-sm shadow-red-500' : 'bg-blue-500 shadow-sm shadow-blue-500'
                    }`}
                  />
                  <span className="font-mono text-xs font-semibold text-white">
                    Charge #{idx + 1}: <strong className={c.q > 0 ? 'text-red-400' : 'text-blue-400'}>{c.q > 0 ? `+${c.q}` : c.q} nC</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    ({c.x.toFixed(1)}, {c.y.toFixed(1)})
                  </span>
                  {charges.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCharge(c.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Charge Position & Value Inputs */}
          {selectedCharge && (
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-3 text-xs">
              <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
                Position &amp; Magnitude of Selected Charge
              </div>
              <NumericInput
                label="Charge Q"
                value={selectedCharge.q}
                min={-10}
                max={10}
                step={0.5}
                unit="nC"
                color={selectedCharge.q >= 0 ? 'red' : 'blue'}
                onChange={(val) =>
                  setCharges(charges.map((c) => (c.id === selectedCharge.id ? { ...c, q: val } : c)))
                }
              />
              <NumericInput
                label="X Position"
                value={selectedCharge.x}
                min={-3.0}
                max={3.0}
                step={0.1}
                unit="m"
                color="cyan"
                onChange={(val) =>
                  setCharges(charges.map((c) => (c.id === selectedCharge.id ? { ...c, x: val } : c)))
                }
              />
              <NumericInput
                label="Y Position"
                value={selectedCharge.y}
                min={-3.0}
                max={3.0}
                step={0.1}
                unit="m"
                color="purple"
                onChange={(val) =>
                  setCharges(charges.map((c) => (c.id === selectedCharge.id ? { ...c, y: val } : c)))
                }
              />
            </div>
          )}

          {/* Visualization Toggles */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showFieldLines}
                onChange={(e) => setShowFieldLines(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-0"
              />
              RK4 Electric Field Lines
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showEquipotentials}
                onChange={(e) => setShowEquipotentials(e.target.checked)}
                className="rounded text-purple-500 focus:ring-0"
              />
              Equipotential Potential V Heatmap
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showGaussianSurface}
                onChange={(e) => setShowGaussianSurface(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-0"
              />
              Gaussian Enclosing Sphere
            </label>
          </div>
        </div>

        {/* Live Results Panel */}
        <ResultsPanel
          title="Gauss's Law for Electrostatics"
          lawName="Φ_E = ∮ E·dA = Q_enc / ε₀"
          results={[
            {
              label: 'Enclosed Charge Q_enc',
              value: enclosedCharge,
              unit: 'nC',
              formula: 'Q_{\\text{enc}} = \\sum_{r_i \\leq R} q_i',
              highlight: enclosedCharge >= 0 ? 'red' : 'blue'
            },
            {
              label: 'Numerical Electric Flux Φ_E',
              value: numericalGaussFlux,
              unit: 'N·m²/C',
              formula: '\\oiint \\mathbf{E} \\cdot d\\mathbf{A}',
              highlight: 'cyan'
            },
            {
              label: 'E-field at Gaussian Surface',
              value: vNorm(computeElectricField(charges, gaussianRadius, 0, 0)),
              unit: 'N/C',
              highlight: 'emerald'
            },
            {
              label: 'Total Charges in Space',
              value: charges.length,
              highlight: 'purple'
            }
          ]}
        />

        {/* Gaussian Radius Input */}
        <div className="glass-panel p-3 rounded-xl border-cyan-500/20">
          <div className="text-[11px] font-mono text-cyan-400 font-semibold uppercase mb-3">Gaussian Surface</div>
          <NumericInput
            label="Gaussian Sphere Radius R"
            value={gaussianRadius}
            min={0.5}
            max={4.0}
            step={0.1}
            unit="m"
            color="cyan"
            onChange={setGaussianRadius}
          />
        </div>

        {/* Calculation Panel */}
        <CalculationPanel
          title="Gauss's Law for Electrostatics"
          formulaLatex="\Phi_E = \oiint_{\partial V} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enclosed}}}{\varepsilon_0}"
          inputs={[
            { label: 'Enclosed Q', value: `${enclosedCharge.toFixed(2)} nC` },
            { label: 'Gaussian Radius', value: `${gaussianRadius.toFixed(1)} m` },
            { label: 'Charges in Space', value: charges.length }
          ]}
          steps={[
            `\\text{1. Calculate Coulomb field } \\mathbf{E}(\\mathbf{r}) = \\frac{1}{4\\pi\\varepsilon_0} \\sum \\frac{q_i}{|\\mathbf{r}-\\mathbf{r}_i|^3}(\\mathbf{r}-\\mathbf{r}_i)`,
            `\\text{2. Identify charges inside Gaussian sphere: } Q_{\\text{enc}} = ${enclosedCharge.toFixed(2)} \\text{ nC}`,
            `\\text{3. Theoretical Gauss Flux } \\Phi_{E,\\text{analytic}} = \\frac{Q_{\\text{enc}}}{\\varepsilon_0} \\propto ${enclosedCharge.toFixed(2)}`,
            `\\text{4. Numerical Surface Flux } \\oiint \\mathbf{E} \\cdot \\hat{\\mathbf{n}} \\, dS = ${numericalGaussFlux.toFixed(4)}`
          ]}
          resultLatex={`\\Phi_E = \\oiint \\mathbf{E} \\cdot d\\mathbf{A} = \\frac{Q_{\\text{enc}}}{\\varepsilon_0}`}
          physicalMeaning="Gauss's Law states that the net outward electric flux through any closed Gaussian surface is directly proportional to the total net charge enclosed inside, independently of the charge arrangement."
        />
      </div>
    </div>
  );
};

export default ElectricFieldView;
