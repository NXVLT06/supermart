// Mathematical Engine for Vector Calculus, Integral Theorems & Electromagnetics

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type VectorFieldFn = (x: number, y: number, z: number, t?: number) => Vec3;
export type ScalarFieldFn = (x: number, y: number, z: number, t?: number) => number;

export interface PointCharge {
  id: string;
  x: number;
  y: number;
  z: number;
  q: number; // in nanocoulombs
}

export interface TheoremVerificationResult {
  lhsName: string;
  rhsName: string;
  lhsValue: number;
  rhsValue: number;
  difference: number;
  relativeErrorPercent: number;
  tolerance: number;
  isVerified: boolean;
  lhsFormula: string;
  rhsFormula: string;
  steps: string[];
}

// Vector Helper Functions
export const vAdd = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const vSub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const vScale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const vDot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const vCross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});
export const vNorm = (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
export const vNormalize = (a: Vec3): Vec3 => {
  const n = vNorm(a);
  return n > 1e-9 ? { x: a.x / n, y: a.y / n, z: a.z / n } : { x: 0, y: 0, z: 0 };
};

// Safe Math Expression Parser for Custom Fields
export function parseCustomField(exprP: string, exprQ: string, exprR: string): VectorFieldFn {
  const cleanExpr = (expr: string) => {
    return expr
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/exp/g, 'Math.exp')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/pi/gi, 'Math.PI');
  };

  try {
    const fnP = new Function('x', 'y', 'z', 't', `try { return Number(${cleanExpr(exprP || '0')}); } catch(e) { return 0; }`);
    const fnQ = new Function('x', 'y', 'z', 't', `try { return Number(${cleanExpr(exprQ || '0')}); } catch(e) { return 0; }`);
    const fnR = new Function('x', 'y', 'z', 't', `try { return Number(${cleanExpr(exprR || '0')}); } catch(e) { return 0; }`);

    return (x: number, y: number, z: number, t = 0): Vec3 => {
      const p = fnP(x, y, z, t);
      const q = fnQ(x, y, z, t);
      const r = fnR(x, y, z, t);
      return {
        x: Number.isFinite(p) ? p : 0,
        y: Number.isFinite(q) ? q : 0,
        z: Number.isFinite(r) ? r : 0
      };
    };
  } catch (e) {
    return () => ({ x: 0, y: 0, z: 0 });
  }
}

// Vector Calculus Differential Operators
export function computeGradient(scalarFn: ScalarFieldFn, x: number, y: number, z: number, h = 1e-4): Vec3 {
  const dfdx = (scalarFn(x + h, y, z) - scalarFn(x - h, y, z)) / (2 * h);
  const dfdy = (scalarFn(x, y + h, z) - scalarFn(x, y - h, z)) / (2 * h);
  const dfdz = (scalarFn(x, y, z + h) - scalarFn(x, y, z - h)) / (2 * h);
  return { x: dfdx, y: dfdy, z: dfdz };
}

export function computeDivergence(fieldFn: VectorFieldFn, x: number, y: number, z: number, h = 1e-4): number {
  const dPdx = (fieldFn(x + h, y, z).x - fieldFn(x - h, y, z).x) / (2 * h);
  const dQdy = (fieldFn(x, y + h, z).y - fieldFn(x, y - h, z).y) / (2 * h);
  const dRdz = (fieldFn(x, y, z + h).z - fieldFn(x, y, z - h).z) / (2 * h);
  return dPdx + dQdy + dRdz;
}

export function computeCurl(fieldFn: VectorFieldFn, x: number, y: number, z: number, h = 1e-4): Vec3 {
  const dRdy = (fieldFn(x, y + h, z).z - fieldFn(x, y - h, z).z) / (2 * h);
  const dQdz = (fieldFn(x, y, z + h).y - fieldFn(x, y, z - h).y) / (2 * h);

  const dPdz = (fieldFn(x, y, z + h).x - fieldFn(x, y, z - h).x) / (2 * h);
  const dRdx = (fieldFn(x + h, y, z).z - fieldFn(x - h, y, z).z) / (2 * h);

  const dQdx = (fieldFn(x + h, y, z).y - fieldFn(x - h, y, z).y) / (2 * h);
  const dPdy = (fieldFn(x, y + h, z).x - fieldFn(x, y - h, z).x) / (2 * h);

  return {
    x: dRdy - dQdz,
    y: dPdz - dRdx,
    z: dQdx - dPdy
  };
}

// Numerical Line Integral: int_C F · dr
export function calculateLineIntegral(
  fieldFn: VectorFieldFn,
  curveFn: (t: number) => Vec3,
  tMin: number,
  tMax: number,
  steps = 300
): { totalIntegral: number; samples: Array<{ point: Vec3; dr: Vec3; field: Vec3; dotProduct: number; cumulative: number }> } {
  const dt = (tMax - tMin) / steps;
  let totalIntegral = 0;
  const samples = [];

  for (let i = 0; i <= steps; i++) {
    const t = tMin + i * dt;
    const pt = curveFn(t);
    
    // Tangent dr/dt using finite difference
    const ptNext = curveFn(Math.min(tMax, t + dt * 0.5));
    const ptPrev = curveFn(Math.max(tMin, t - dt * 0.5));
    const deltaT = (Math.min(tMax, t + dt * 0.5) - Math.max(tMin, t - dt * 0.5)) || 1e-5;
    
    const dr = {
      x: ((ptNext.x - ptPrev.x) / deltaT) * dt,
      y: ((ptNext.y - ptPrev.y) / deltaT) * dt,
      z: ((ptNext.z - ptPrev.z) / deltaT) * dt
    };

    const f = fieldFn(pt.x, pt.y, pt.z);
    const dot = vDot(f, dr);

    if (i > 0) {
      totalIntegral += dot;
    }

    samples.push({
      point: pt,
      dr,
      field: f,
      dotProduct: dot,
      cumulative: totalIntegral
    });
  }

  return { totalIntegral, samples };
}

// Numerical Surface Integral (Flux): iint_S F · n dS
export function calculateSurfaceFlux(
  fieldFn: VectorFieldFn,
  surfaceType: 'disk' | 'sphere_cap' | 'paraboloid' | 'cylinder_side',
  radius = 2.0,
  height = 2.0,
  uSteps = 40,
  vSteps = 40
): { totalFlux: number; samples: Array<{ point: Vec3; normal: Vec3; areaElement: number; field: Vec3; fluxElement: number }> } {
  let totalFlux = 0;
  const samples = [];

  if (surfaceType === 'disk') {
    // Disk in xy plane at z = 0, oriented +z
    const dr = radius / uSteps;
    const dTheta = (2 * Math.PI) / vSteps;
    for (let i = 1; i <= uSteps; i++) {
      const r = (i - 0.5) * dr;
      for (let j = 0; j < vSteps; j++) {
        const theta = j * dTheta;
        const pt = { x: r * Math.cos(theta), y: r * Math.sin(theta), z: 0 };
        const normal = { x: 0, y: 0, z: 1 };
        const dS = r * dr * dTheta;
        const f = fieldFn(pt.x, pt.y, pt.z);
        const fluxElem = vDot(f, normal) * dS;
        totalFlux += fluxElem;
        samples.push({ point: pt, normal, areaElement: dS, field: f, fluxElement: fluxElem });
      }
    }
  } else if (surfaceType === 'paraboloid') {
    // z = height * (1 - (x^2+y^2)/radius^2), r in [0, radius], theta in [0, 2pi]
    // Outward normal: n dS = (2 h x / R^2, 2 h y / R^2, 1) r dr dtheta
    const dr = radius / uSteps;
    const dTheta = (2 * Math.PI) / vSteps;
    for (let i = 1; i <= uSteps; i++) {
      const r = (i - 0.5) * dr;
      for (let j = 0; j < vSteps; j++) {
        const theta = j * dTheta;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = height * (1 - (r * r) / (radius * radius));
        const pt = { x, y, z };
        
        const nx = (2 * height * x) / (radius * radius);
        const ny = (2 * height * y) / (radius * radius);
        const nz = 1;
        const nNorm = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const dS = nNorm * r * dr * dTheta;
        const normal = { x: nx / nNorm, y: ny / nNorm, z: nz / nNorm };
        
        const f = fieldFn(pt.x, pt.y, pt.z);
        const fluxElem = vDot(f, { x: nx, y: ny, z: nz }) * r * dr * dTheta;
        totalFlux += fluxElem;
        samples.push({ point: pt, normal, areaElement: dS, field: f, fluxElement: fluxElem });
      }
    }
  } else if (surfaceType === 'sphere_cap') {
    // Upper hemisphere z >= 0
    const dPhi = (Math.PI / 2) / uSteps;
    const dTheta = (2 * Math.PI) / vSteps;
    for (let i = 1; i <= uSteps; i++) {
      const phi = (i - 0.5) * dPhi; // polar angle from z-axis
      for (let j = 0; j < vSteps; j++) {
        const theta = j * dTheta;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        const pt = { x, y, z };
        const normal = { x: x / radius, y: y / radius, z: z / radius };
        const dS = radius * radius * Math.sin(phi) * dPhi * dTheta;
        const f = fieldFn(pt.x, pt.y, pt.z);
        const fluxElem = vDot(f, normal) * dS;
        totalFlux += fluxElem;
        samples.push({ point: pt, normal, areaElement: dS, field: f, fluxElement: fluxElem });
      }
    }
  } else {
    // Cylinder side of height [-H/2, H/2]
    const dz = height / uSteps;
    const dTheta = (2 * Math.PI) / vSteps;
    for (let i = 0; i < uSteps; i++) {
      const z = -height / 2 + (i + 0.5) * dz;
      for (let j = 0; j < vSteps; j++) {
        const theta = j * dTheta;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        const pt = { x, y, z };
        const normal = { x: Math.cos(theta), y: Math.sin(theta), z: 0 };
        const dS = radius * dTheta * dz;
        const f = fieldFn(pt.x, pt.y, pt.z);
        const fluxElem = vDot(f, normal) * dS;
        totalFlux += fluxElem;
        samples.push({ point: pt, normal, areaElement: dS, field: f, fluxElement: fluxElem });
      }
    }
  }

  return { totalFlux, samples };
}

// Numerical Volume Integral: iiint_V f dV
export function calculateVolumeIntegral(
  scalarFn: ScalarFieldFn,
  shape: 'sphere' | 'cube' | 'cylinder',
  size = 2.0,
  gridN = 24
): { totalIntegral: number; sampleCount: number } {
  const step = (2 * size) / gridN;
  const dV = step * step * step;
  let total = 0;
  let sampleCount = 0;

  for (let i = 0; i < gridN; i++) {
    const x = -size + (i + 0.5) * step;
    for (let j = 0; j < gridN; j++) {
      const y = -size + (j + 0.5) * step;
      for (let k = 0; k < gridN; k++) {
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
          const val = scalarFn(x, y, z);
          total += val * dV;
          sampleCount++;
        }
      }
    }
  }

  return { totalIntegral: total, sampleCount };
}

// ==========================================
// THEOREM VERIFICATION ENGINES
// ==========================================

// 1. Green's Theorem Verification
export function verifyGreensTheorem(
  fieldFn: VectorFieldFn,
  radius = 2.0,
  steps = 360,
  gridN = 50
): TheoremVerificationResult {
  // Boundary curve: Circle r(t) = (R cos t, R sin t, 0)
  const dt = (2 * Math.PI) / steps;
  let lineCirculation = 0;
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const x = radius * Math.cos(t);
    const y = radius * Math.sin(t);
    const dx = -radius * Math.sin(t) * dt;
    const dy = radius * Math.cos(t) * dt;
    const f = fieldFn(x, y, 0);
    lineCirculation += f.x * dx + f.y * dy;
  }

  // Interior double integral: iint_D (dQ/dx - dP/dy) dA
  const step = (2 * radius) / gridN;
  const dA = step * step;
  let doubleIntegral = 0;
  const h = 1e-4;

  for (let i = 0; i < gridN; i++) {
    const x = -radius + (i + 0.5) * step;
    for (let j = 0; j < gridN; j++) {
      const y = -radius + (j + 0.5) * step;
      if (x * x + y * y <= radius * radius) {
        const dQdx = (fieldFn(x + h, y, 0).y - fieldFn(x - h, y, 0).y) / (2 * h);
        const dPdy = (fieldFn(x, y + h, 0).x - fieldFn(x, y - h, 0).x) / (2 * h);
        const curlZ = dQdx - dPdy;
        doubleIntegral += curlZ * dA;
      }
    }
  }

  const diff = Math.abs(lineCirculation - doubleIntegral);
  const avg = (Math.abs(lineCirculation) + Math.abs(doubleIntegral)) / 2;
  const relError = avg > 1e-5 ? (diff / avg) * 100 : (diff < 1e-4 ? 0 : diff * 100);
  const tolerance = 0.05; // 5% numerical tolerance on discrete Riemann grid

  return {
    lhsName: 'Line Integral ∮_C (L dx + M dy)',
    rhsName: 'Double Integral ∬_D (∂M/∂x - ∂L/∂y) dA',
    lhsValue: lineCirculation,
    rhsValue: doubleIntegral,
    difference: diff,
    relativeErrorPercent: relError,
    tolerance,
    isVerified: relError <= 5.0 || diff < 0.05,
    lhsFormula: '\\oint_{\\partial D} (L\\,dx + M\\,dy)',
    rhsFormula: '\\iint_{D} \\left(\\frac{\\partial M}{\\partial x} - \\frac{\\partial L}{\\partial y}\\right) dA',
    steps: [
      `1. Parameterize boundary curve C: x(t) = ${radius}\\cos(t), y(t) = ${radius}\\sin(t) \\text{ for } t \\in [0, 2\\pi]`,
      `2. Compute line circulation: \\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = ${lineCirculation.toFixed(4)}`,
      `3. Compute 2D Curl (\\partial M/\\partial x - \\partial L/\\partial y) over disk region D of radius ${radius}`,
      `4. Compute area integral: \\iint_D (\\nabla \\times \\mathbf{F})_z \\, dA = ${doubleIntegral.toFixed(4)}`,
      `5. Numerical discrepancy \\Delta = ${diff.toFixed(5)} (${relError.toFixed(3)}\\% relative error)`
    ]
  };
}

// 2. Gauss' Divergence Theorem Verification
export function verifyGaussTheorem(
  fieldFn: VectorFieldFn,
  radius = 2.0,
  uSteps = 40,
  vSteps = 40,
  gridN = 30
): TheoremVerificationResult {
  // Closed Sphere of radius R
  // LHS: Closed Surface Flux ∯_S F · n dS
  const dPhi = Math.PI / uSteps;
  const dTheta = (2 * Math.PI) / vSteps;
  let totalSurfaceFlux = 0;

  for (let i = 1; i <= uSteps; i++) {
    const phi = (i - 0.5) * dPhi;
    for (let j = 0; j < vSteps; j++) {
      const theta = j * dTheta;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      const normal = { x: x / radius, y: y / radius, z: z / radius };
      const dS = radius * radius * Math.sin(phi) * dPhi * dTheta;
      const f = fieldFn(x, y, z);
      totalSurfaceFlux += vDot(f, normal) * dS;
    }
  }

  // RHS: Volume Integral ∭_V (∇ · F) dV
  const step = (2 * radius) / gridN;
  const dV = step * step * step;
  let totalVolumeDiv = 0;

  for (let i = 0; i < gridN; i++) {
    const x = -radius + (i + 0.5) * step;
    for (let j = 0; j < gridN; j++) {
      const y = -radius + (j + 0.5) * step;
      for (let k = 0; k < gridN; k++) {
        const z = -radius + (k + 0.5) * step;
        if (x * x + y * y + z * z <= radius * radius) {
          const divF = computeDivergence(fieldFn, x, y, z);
          totalVolumeDiv += divF * dV;
        }
      }
    }
  }

  const diff = Math.abs(totalSurfaceFlux - totalVolumeDiv);
  const avg = (Math.abs(totalSurfaceFlux) + Math.abs(totalVolumeDiv)) / 2;
  const relError = avg > 1e-5 ? (diff / avg) * 100 : (diff < 1e-4 ? 0 : diff * 100);

  return {
    lhsName: 'Surface Flux ∯_∂V F · n dS',
    rhsName: 'Volume Divergence ∭_V (∇·F) dV',
    lhsValue: totalSurfaceFlux,
    rhsValue: totalVolumeDiv,
    difference: diff,
    relativeErrorPercent: relError,
    tolerance: 0.05,
    isVerified: relError <= 5.0 || diff < 0.08,
    lhsFormula: '\\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS',
    rhsFormula: '\\iiint_{V} (\\nabla \\cdot \\mathbf{F}) \\, dV',
    steps: [
      `1. Define closed Gaussian sphere surface S of radius R = ${radius}`,
      `2. Integrate outward normal flux: \\oiint_{\\partial V} \\mathbf{F} \\cdot \\hat{\\mathbf{n}} \\, dS = ${totalSurfaceFlux.toFixed(4)}`,
      `3. Compute local divergence field \\nabla \\cdot \\mathbf{F} at each interior volume voxel`,
      `4. Integrate volume divergence over solid sphere: \\iiint_V (\\nabla \\cdot \\mathbf{F}) \\, dV = ${totalVolumeDiv.toFixed(4)}`,
      `5. Error comparison: \\Delta = ${diff.toFixed(5)} (${relError.toFixed(3)}\\% error)`
    ]
  };
}

// 3. Stokes' Theorem Verification
export function verifyStokesTheorem(
  fieldFn: VectorFieldFn,
  radius = 2.0,
  steps = 360,
  uSteps = 40,
  vSteps = 40
): TheoremVerificationResult {
  // Boundary curve C: circle of radius R in xy plane (z = 0)
  const dt = (2 * Math.PI) / steps;
  let lineCirculation = 0;
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const x = radius * Math.cos(t);
    const y = radius * Math.sin(t);
    const z = 0;
    const dr = {
      x: -radius * Math.sin(t) * dt,
      y: radius * Math.cos(t) * dt,
      z: 0
    };
    const f = fieldFn(x, y, z);
    lineCirculation += vDot(f, dr);
  }

  // Surface S: Upper hemisphere cap z = sqrt(R^2 - x^2 - y^2) >= 0 with boundary C
  const dPhi = (Math.PI / 2) / uSteps;
  const dTheta = (2 * Math.PI) / vSteps;
  let surfaceCurlFlux = 0;

  for (let i = 1; i <= uSteps; i++) {
    const phi = (i - 0.5) * dPhi;
    for (let j = 0; j < vSteps; j++) {
      const theta = j * dTheta;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      const normal = { x: x / radius, y: y / radius, z: z / radius };
      const dS = radius * radius * Math.sin(phi) * dPhi * dTheta;
      const curlF = computeCurl(fieldFn, x, y, z);
      surfaceCurlFlux += vDot(curlF, normal) * dS;
    }
  }

  const diff = Math.abs(lineCirculation - surfaceCurlFlux);
  const avg = (Math.abs(lineCirculation) + Math.abs(surfaceCurlFlux)) / 2;
  const relError = avg > 1e-5 ? (diff / avg) * 100 : (diff < 1e-4 ? 0 : diff * 100);

  return {
    lhsName: 'Boundary Line Integral ∮_∂S F · dr',
    rhsName: 'Surface Curl Integral ∬_S (∇×F) · n dS',
    lhsValue: lineCirculation,
    rhsValue: surfaceCurlFlux,
    difference: diff,
    relativeErrorPercent: relError,
    tolerance: 0.05,
    isVerified: relError <= 5.0 || diff < 0.08,
    lhsFormula: '\\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r}',
    rhsFormula: '\\iint_{S} (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS',
    steps: [
      `1. Parameterize open boundary curve \\partial S: circle of radius ${radius} in xy-plane`,
      `2. Compute boundary circulation: \\oint_{\\partial S} \\mathbf{F} \\cdot d\\mathbf{r} = ${lineCirculation.toFixed(4)}`,
      `3. Parameterize hemisphere surface S bounded by \\partial S`,
      `4. Integrate curl flux: \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\hat{\\mathbf{n}} \\, dS = ${surfaceCurlFlux.toFixed(4)}`,
      `5. Validation: \\Delta = ${diff.toFixed(5)} (${relError.toFixed(3)}\\% error)`
    ]
  };
}

// ==========================================
// ELECTROMAGNETIC FIELD FORMULAS
// ==========================================

// Coulomb's Law: Electric field from multiple point charges
export function computeElectricField(charges: PointCharge[], x: number, y: number, z: number): Vec3 {
  const k_e = 8.98755; // N·m²/C² scaled for visual rendering
  let ex = 0;
  let ey = 0;
  let ez = 0;

  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const dz = z - c.z;
    const distSq = dx * dx + dy * dy + dz * dz + 0.15; // Softening parameter to avoid division by zero
    const dist = Math.sqrt(distSq);
    const factor = (k_e * c.q) / (distSq * dist);
    ex += factor * dx;
    ey += factor * dy;
    ez += factor * dz;
  }

  return { x: ex, y: ey, z: ez };
}

// Electric Potential V(x,y,z)
export function computeElectricPotential(charges: PointCharge[], x: number, y: number, z: number): number {
  const k_e = 8.98755;
  let v = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const dz = z - c.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + 0.15);
    v += (k_e * c.q) / dist;
  }
  return v;
}

// Magnetic Field from Current Wire along Z-axis (Biot-Savart / Ampère)
export function computeStraightWireBField(currentI: number, x: number, y: number, _z: number): Vec3 {
  const mu0_over_2pi = 1.0; // Scaled constant
  const rSq = x * x + y * y + 0.08;
  const factor = (mu0_over_2pi * currentI) / rSq;
  // B = factor * (-y i + x j)
  return {
    x: -factor * y,
    y: factor * x,
    z: 0
  };
}

// Magnetic Field from Circular Loop in xy-plane of radius a with current I
export function computeLoopBField(currentI: number, radiusA: number, x: number, y: number, z: number): Vec3 {
  const segments = 40;
  const dTheta = (2 * Math.PI) / segments;
  let bx = 0;
  let by = 0;
  let bz = 0;

  for (let i = 0; i < segments; i++) {
    const theta = i * dTheta;
    const wx = radiusA * Math.cos(theta);
    const wy = radiusA * Math.sin(theta);
    const wz = 0;

    // Current segment dl = I * (-sin theta, cos theta, 0) * dTheta
    const dlx = -radiusA * Math.sin(theta) * dTheta * currentI;
    const dly = radiusA * Math.cos(theta) * dTheta * currentI;
    const dlz = 0;

    // Vector r from wire element to point (x,y,z)
    const rx = x - wx;
    const ry = y - wy;
    const rz = z - wz;
    const distSq = rx * rx + ry * ry + rz * rz + 0.1;
    const distCube = Math.pow(distSq, 1.5);

    // dl x r
    const cX = dly * rz - dlz * ry;
    const cY = dlz * rx - dlx * rz;
    const cZ = dlx * ry - dly * rx;

    bx += cX / distCube;
    by += cY / distCube;
    bz += cZ / distCube;
  }

  return { x: bx, y: by, z: bz };
}

// Electromagnetic Wave Field at position x and time t
export function computeEMWave(
  x: number,
  t: number,
  params: { amplitude: number; frequency: number; wavelength: number; speed: number; polarization: 'linear' | 'circular' }
): { E: Vec3; B: Vec3; S: Vec3 } {
  const k = (2 * Math.PI) / params.wavelength;
  const omega = 2 * Math.PI * params.frequency;
  const phase = k * x - omega * t * params.speed;

  let ey = params.amplitude * Math.sin(phase);
  let ez = 0;
  let by = 0;
  let bz = (params.amplitude / 2.0) * Math.sin(phase);

  if (params.polarization === 'circular') {
    ez = params.amplitude * Math.cos(phase);
    by = -(params.amplitude / 2.0) * Math.cos(phase);
  }

  const E: Vec3 = { x: 0, y: ey, z: ez };
  const B: Vec3 = { x: 0, y: by, z: bz };
  // Poynting vector S = (E x B) / mu0 (propagates in +x direction)
  const S: Vec3 = vCross(E, B);

  return { E, B, S };
}
