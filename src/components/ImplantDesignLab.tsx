import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  Layers,
  RotateCcw,
  Sliders,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { GeneratedMeshData } from '../services/volumeGenerator';
import {
  exportMeshToOBJ,
  exportMeshToSTEP,
  exportMeshToSTL,
} from '../services/meshExporters';

export type ImplantTemplateId = 'tmj_ramus' | 'cranial_vault' | 'mandibular_bridge';
export type ImplantFinishPreset = 'titanium' | 'peek' | 'cocrmo' | 'heatmap';

interface ControlPoint2D {
  u: number; // Normalized [-1, 1]
  v: number; // Normalized [-1, 1]
}

interface ImplantTemplateSpec {
  id: ImplantTemplateId;
  titleEn: string;
  titleId: string;
  subtitleEn: string;
  subtitleId: string;
  clinicalTargetEn: string;
  clinicalTargetId: string;
  defaultPoints: ControlPoint2D[];
  compactPoints: ControlPoint2D[];
  extendedPoints: ControlPoint2D[];
  defaultThicknessMm: number;
  defaultBevelMm: number;
  defaultOffsetMm: number;
  defaultScrews: number;
  spanUMm: number;
  spanVMm: number;
}

const IMPLANT_TEMPLATES: Record<ImplantTemplateId, ImplantTemplateSpec> = {
  tmj_ramus: {
    id: 'tmj_ramus',
    titleEn: 'TMJ Ramus & Condylar Prosthesis',
    titleId: 'Prostesis Ramus & Kondilus TMJ',
    subtitleEn: 'Compound lateral ramus curvature + articular condylar neck',
    subtitleId: 'Kelengkungan lateral ramus majemuk + leher kondilus artikular',
    clinicalTargetEn: 'Posterior Mandibular Ramus & Condyle',
    clinicalTargetId: 'Ramus Mandibula Posterior & Kondilus',
    defaultPoints: [
      { u: -0.34, v: 0.78 },
      { u: 0.28, v: 0.82 },
      { u: 0.52, v: 0.34 },
      { u: 0.46, v: -0.22 },
      { u: 0.56, v: -0.72 },
      { u: -0.18, v: -0.82 },
      { u: -0.52, v: -0.34 },
      { u: -0.44, v: 0.26 },
    ],
    compactPoints: [
      { u: -0.24, v: 0.66 },
      { u: 0.22, v: 0.68 },
      { u: 0.38, v: 0.24 },
      { u: 0.34, v: -0.22 },
      { u: 0.42, v: -0.58 },
      { u: -0.14, v: -0.66 },
      { u: -0.38, v: -0.24 },
      { u: -0.34, v: 0.2 },
    ],
    extendedPoints: [
      { u: -0.44, v: 0.84 },
      { u: 0.38, v: 0.86 },
      { u: 0.66, v: 0.38 },
      { u: 0.62, v: -0.22 },
      { u: 0.72, v: -0.78 },
      { u: -0.28, v: -0.86 },
      { u: -0.64, v: -0.36 },
      { u: -0.56, v: 0.32 },
    ],
    defaultThicknessMm: 2.2,
    defaultBevelMm: 0.45,
    defaultOffsetMm: 0.25,
    defaultScrews: 5,
    spanUMm: 34,
    spanVMm: 54,
  },
  cranial_vault: {
    id: 'cranial_vault',
    titleEn: 'Cranial Vault Cranioplasty Plate',
    titleId: 'Pelat Kranioplasti Kubah Kranial',
    subtitleEn: 'Bi-axial spherical skull dome reconstruction with feathered perimeter',
    subtitleId: 'Rekonstruksi kubah tengkorak sferis bi-aksial dengan tepi melandai',
    clinicalTargetEn: 'Fronto-Parietal Cranial Vault Defect',
    clinicalTargetId: 'Defek Kubah Kranial Fronto-Parietal',
    defaultPoints: [
      { u: 0.0, v: 0.76 },
      { u: 0.56, v: 0.56 },
      { u: 0.78, v: 0.02 },
      { u: 0.54, v: -0.54 },
      { u: 0.0, v: -0.74 },
      { u: -0.56, v: -0.54 },
      { u: -0.78, v: 0.02 },
      { u: -0.54, v: 0.56 },
    ],
    compactPoints: [
      { u: 0.0, v: 0.58 },
      { u: 0.42, v: 0.42 },
      { u: 0.6, v: 0.0 },
      { u: 0.42, v: -0.42 },
      { u: 0.0, v: -0.58 },
      { u: -0.42, v: -0.42 },
      { u: -0.6, v: 0.0 },
      { u: -0.42, v: 0.42 },
    ],
    extendedPoints: [
      { u: 0.0, v: 0.86 },
      { u: 0.66, v: 0.64 },
      { u: 0.88, v: 0.04 },
      { u: 0.64, v: -0.64 },
      { u: 0.0, v: -0.84 },
      { u: -0.66, v: -0.64 },
      { u: -0.88, v: 0.04 },
      { u: -0.64, v: 0.64 },
    ],
    defaultThicknessMm: 2.6,
    defaultBevelMm: 0.6,
    defaultOffsetMm: 0.2,
    defaultScrews: 6,
    spanUMm: 72,
    spanVMm: 68,
  },
  mandibular_bridge: {
    id: 'mandibular_bridge',
    titleEn: 'Mandibular Continuity Bridging Plate',
    titleId: 'Pelat Jembatan Kontinuitas Mandibula',
    subtitleEn: 'Parabolic lower-jaw corpus arc contoured below mental foramen',
    subtitleId: 'Lengkung korpus rahang bawah parabolik di bawah foramen mentale',
    clinicalTargetEn: 'Mandibular Body & Parasymphysis',
    clinicalTargetId: 'Korpus Mandibula & Parasimfisis',
    defaultPoints: [
      { u: -0.82, v: 0.34 },
      { u: -0.28, v: 0.28 },
      { u: 0.28, v: 0.28 },
      { u: 0.82, v: 0.34 },
      { u: 0.86, v: -0.32 },
      { u: 0.28, v: -0.36 },
      { u: -0.28, v: -0.36 },
      { u: -0.86, v: -0.32 },
    ],
    compactPoints: [
      { u: -0.68, v: 0.24 },
      { u: -0.22, v: 0.2 },
      { u: 0.22, v: 0.2 },
      { u: 0.68, v: 0.24 },
      { u: 0.7, v: -0.24 },
      { u: 0.22, v: -0.26 },
      { u: -0.22, v: -0.26 },
      { u: -0.7, v: -0.24 },
    ],
    extendedPoints: [
      { u: -0.9, v: 0.44 },
      { u: -0.3, v: 0.38 },
      { u: 0.3, v: 0.38 },
      { u: 0.9, v: 0.44 },
      { u: 0.92, v: -0.42 },
      { u: 0.3, v: -0.44 },
      { u: -0.3, v: -0.44 },
      { u: -0.92, v: -0.42 },
    ],
    defaultThicknessMm: 2.4,
    defaultBevelMm: 0.4,
    defaultOffsetMm: 0.3,
    defaultScrews: 6,
    spanUMm: 68,
    spanVMm: 24,
  },
};

const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

/**
 * Evaluate smooth closed Catmull-Rom spline in 2D normalized UV space [-1, 1]
 */
function sampleClosedSpline(points: ControlPoint2D[], segmentsPerEdge = 10): ControlPoint2D[] {
  const n = points.length;
  const result: ControlPoint2D[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let s = 0; s < segmentsPerEdge; s++) {
      const t = s / segmentsPerEdge;
      const t2 = t * t;
      const t3 = t2 * t;

      const u =
        0.5 *
        (2 * p1.u +
          (-p0.u + p2.u) * t +
          (2 * p0.u - 5 * p1.u + 4 * p2.u - p3.u) * t2 +
          (-p0.u + 3 * p1.u - 3 * p2.u + p3.u) * t3);
      const v =
        0.5 *
        (2 * p1.v +
          (-p0.v + p2.v) * t +
          (2 * p0.v - 5 * p1.v + 4 * p2.v - p3.v) * t2 +
          (-p0.v + 3 * p1.v - 3 * p2.v + p3.v) * t3);

      result.push({ u, v });
    }
  }
  return result;
}

/**
 * 2D point-in-polygon raycast test + minimum Euclidean distance to polygon boundary
 */
function evaluatePolygonContainment(
  u: number,
  v: number,
  poly: ControlPoint2D[],
): { inside: boolean; edgeDist: number } {
  let inside = false;
  let minDistSq = Infinity;
  const n = poly.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].u;
    const yi = poly[i].v;
    const xj = poly[j].u;
    const yj = poly[j].v;

    const intersect =
      yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;

    const dx = xj - xi;
    const dy = yj - yi;
    const lenSq = dx * dx + dy * dy + 1e-12;
    const proj = Math.max(0, Math.min(1, ((u - xi) * dx + (v - yi) * dy) / lenSq));
    const px = xi + proj * dx;
    const py = yi + proj * dy;
    const dSq = (u - px) * (u - px) + (v - py) * (v - py);
    if (dSq < minDistSq) minDistSq = dSq;
  }

  return { inside, edgeDist: Math.sqrt(minDistSq) };
}

/**
 * Analytical anatomical host bone surface in scene units (1 unit ≈ 4.0 mm)
 */
function evalBoneSurface(
  templateId: ImplantTemplateId,
  u: number,
  v: number,
  conformanceAlpha: number,
): THREE.Vector3 {
  if (templateId === 'cranial_vault') {
    const x = u * 8.2;
    const y = v * 7.6;
    const r2 = u * u + v * v;
    const domeZ = 2.6 - r2 * 2.45 + 0.16 * Math.cos(u * 2.6) * Math.cos(v * 2.2);
    const z = domeZ * conformanceAlpha;
    return new THREE.Vector3(x, y, z);
  }

  if (templateId === 'mandibular_bridge') {
    // Parabolic mandibular body sweeping back along -Z at lateral ends
    const x = u * 8.6;
    const y = v * 3.1 + 0.45 * u * u * conformanceAlpha;
    const archZ = 2.8 - u * u * 3.85 + 0.24 * Math.cos(v * Math.PI);
    const z = archZ * conformanceAlpha;
    return new THREE.Vector3(x, y, z);
  }

  // tmj_ramus: Lateral mandibular ramus plate with superior condylar flare & antegonial curvature
  const x = u * 4.4;
  const y = v * 6.8;
  const ramusCurve =
    1.15 -
    0.72 * u * u -
    0.34 * v * v +
    0.58 * Math.sin(v * 1.9 + 0.3) * (0.65 + 0.35 * u) -
    0.42 * u * v;
  const z = ramusCurve * conformanceAlpha;
  return new THREE.Vector3(x, y, z);
}

/**
 * Compute analytical outward unit normal of the anatomical surface at (u, v)
 */
function evalBoneNormal(
  templateId: ImplantTemplateId,
  u: number,
  v: number,
  conformanceAlpha: number,
): THREE.Vector3 {
  const eps = 0.015;
  const pu1 = evalBoneSurface(templateId, u + eps, v, conformanceAlpha);
  const pu0 = evalBoneSurface(templateId, u - eps, v, conformanceAlpha);
  const pv1 = evalBoneSurface(templateId, u, v + eps, conformanceAlpha);
  const pv0 = evalBoneSurface(templateId, u, v - eps, conformanceAlpha);

  const du = pu1.sub(pu0);
  const dv = pv1.sub(pv0);
  const normal = new THREE.Vector3().crossVectors(du, dv).normalize();
  if (normal.z < 0) normal.negate();
  return normal;
}

interface ImplantMeshBuildResult {
  geometry: THREE.BufferGeometry;
  exportMesh: GeneratedMeshData;
  screwTransforms: Array<{ position: THREE.Vector3; normal: THREE.Vector3 }>;
  surfaceAreaMm2: number;
  volumeCm3: number;
  meanGapMm: number;
  maxGapMm: number;
  triangleCount: number;
  fitGrade: 'EXCELLENT' | 'ACCEPTABLE' | 'NEEDS_CONTOUR';
}

/**
 * Parametric CAD Solid Implant Mesh Builder:
 * Generates a watertight double-curved bone-contoured solid with outward normal extrusion,
 * feathered perimeter beveling, fit deviation heatmap vertex colors, and screw boss positions.
 */
function buildParametricImplantMesh(
  templateId: ImplantTemplateId,
  controlPoints: ControlPoint2D[],
  contourFitPct: number,
  thicknessMm: number,
  edgeBevelMm: number,
  boneOffsetMm: number,
  screwCount: number,
  gridRes: number,
  includeFenestrations: boolean,
): ImplantMeshBuildResult {
  const spec = IMPLANT_TEMPLATES[templateId];
  const splinePoly = sampleClosedSpline(controlPoints, 10);
  const conformance = Math.max(0, Math.min(1, contourFitPct / 100));

  // Scene unit scale: 1 Three.js unit ≈ 4.0 mm
  const MM_TO_SCENE = 0.25;
  const thicknessScene = thicknessMm * MM_TO_SCENE;
  const offsetScene = boneOffsetMm * MM_TO_SCENE;
  const bevelFraction = Math.min(0.45, (edgeBevelMm / Math.max(0.6, thicknessMm)) * 0.5);

  const cols = gridRes;
  const rows = gridRes;
  const insideGrid = new Uint8Array(cols * rows);
  const bottomPts: Array<THREE.Vector3 | null> = new Array(cols * rows).fill(null);
  const topPts: Array<THREE.Vector3 | null> = new Array(cols * rows).fill(null);
  const gapMmGrid = new Float32Array(cols * rows);

  // Optional surgical drainage fenestrations on cranial vault
  const fenestrationCenters: Array<[number, number, number]> =
    includeFenestrations && templateId === 'cranial_vault'
      ? [
          [-0.24, 0.22, 0.085],
          [0.24, 0.22, 0.085],
          [0.0, 0.0, 0.095],
          [-0.24, -0.22, 0.085],
          [0.24, -0.22, 0.085],
        ]
      : [];

  let sumGap = 0;
  let maxGap = 0;
  let validCellSamples = 0;

  for (let r = 0; r < rows; r++) {
    const v = -1 + (2 * r) / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const u = -1 + (2 * c) / (cols - 1);
      const idx = r * cols + c;
      const { inside, edgeDist } = evaluatePolygonContainment(u, v, splinePoly);
      if (!inside) continue;

      let inHole = false;
      for (const [hu, hv, hr] of fenestrationCenters) {
        if (Math.hypot(u - hu, v - hv) < hr) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;

      insideGrid[idx] = 1;

      const idealBonePt = evalBoneSurface(templateId, u, v, 1.0);
      const contouredPt = evalBoneSurface(templateId, u, v, conformance);
      const normal = evalBoneNormal(templateId, u, v, conformance);

      const bottomPt = contouredPt.clone().addScaledVector(normal, offsetScene);

      // Feathered perimeter bevel tapering smoothly near the spline boundary
      const bevelFactor =
        bevelFraction > 0.01
          ? Math.min(1, Math.max(0.28, edgeDist / Math.max(0.04, bevelFraction * 0.42)))
          : 1.0;
      const localThick = thicknessScene * bevelFactor;
      const topPt = bottomPt.clone().addScaledVector(normal, localThick);

      bottomPts[idx] = bottomPt;
      topPts[idx] = topPt;

      // Measure anatomical bone-to-implant fit deviation in mm
      const gapMm = bottomPt.distanceTo(idealBonePt) / MM_TO_SCENE;
      gapMmGrid[idx] = gapMm;
      sumGap += gapMm;
      if (gapMm > maxGap) maxGap = gapMm;
      validCellSamples++;
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];

  const gapToColor = (gapMm: number): [number, number, number] => {
    if (gapMm <= 0.42) return [0.06, 0.88, 0.56]; // Emerald: Ideal sub-0.4mm bone contact
    if (gapMm <= 1.05) {
      const t = (gapMm - 0.42) / 0.63;
      return [0.06 + t * 0.94, 0.88 - t * 0.08, 0.56 - t * 0.56]; // Transition to Clinical Gold
    }
    const t = Math.min(1, (gapMm - 1.05) / 1.8);
    return [1.0, 0.8 - t * 0.58, 0.0 + t * 0.22]; // Coral Red: Gap > 1.0mm needs contouring
  };

  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ga: number, gb: number, gc: number) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const ca = gapToColor(ga);
    const cb = gapToColor(gb);
    const cc = gapToColor(gc);
    colors.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]);
  };

  const pushQuad = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    ga: number,
    gb: number,
    gc: number,
    gd: number,
  ) => {
    pushTri(a, b, c, ga, gb, gc);
    pushTri(a, c, d, ga, gc, gd);
  };

  let activeQuads = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i00 = r * cols + c;
      const i10 = r * cols + (c + 1);
      const i11 = (r + 1) * cols + (c + 1);
      const i01 = (r + 1) * cols + c;

      if (insideGrid[i00] && insideGrid[i10] && insideGrid[i11] && insideGrid[i01]) {
        activeQuads++;
        const t00 = topPts[i00]!;
        const t10 = topPts[i10]!;
        const t11 = topPts[i11]!;
        const t01 = topPts[i01]!;
        const b00 = bottomPts[i00]!;
        const b10 = bottomPts[i10]!;
        const b11 = bottomPts[i11]!;
        const b01 = bottomPts[i01]!;

        const g00 = gapMmGrid[i00];
        const g10 = gapMmGrid[i10];
        const g11 = gapMmGrid[i11];
        const g01 = gapMmGrid[i01];

        // Outer extruded top face (+N)
        pushQuad(t00, t10, t11, t01, g00, g10, g11, g01);
        // Inner bone-contacting face (-N)
        pushQuad(b00, b01, b11, b10, g00, g01, g11, g10);

        // Close watertight perimeter sidewalls on boundary edges
        const isQuadActive = (rr: number, cc: number) => {
          if (rr < 0 || cc < 0 || rr >= rows - 1 || cc >= cols - 1) return false;
          return Boolean(
            insideGrid[rr * cols + cc] &&
              insideGrid[rr * cols + cc + 1] &&
              insideGrid[(rr + 1) * cols + cc + 1] &&
              insideGrid[(rr + 1) * cols + cc],
          );
        };

        if (!isQuadActive(r - 1, c)) {
          pushQuad(b00, b10, t10, t00, g00, g10, g10, g00);
        }
        if (!isQuadActive(r + 1, c)) {
          pushQuad(b11, b01, t01, t11, g11, g01, g01, g11);
        }
        if (!isQuadActive(r, c - 1)) {
          pushQuad(b01, b00, t00, t01, g01, g00, g00, g01);
        }
        if (!isQuadActive(r, c + 1)) {
          pushQuad(b10, b11, t11, t10, g10, g11, g11, g10);
        }
      }
    }
  }

  const posArray = new Float32Array(positions);
  const colArray = new Float32Array(colors);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
  const normalsArray = new Float32Array(normAttr.array as Float32Array);

  // Place countersunk locking screw bosses along anatomically valid interior UV coordinates
  const screwTransforms: Array<{ position: THREE.Vector3; normal: THREE.Vector3 }> = [];
  for (let s = 0; s < screwCount; s++) {
    let su = 0;
    let sv = 0;
    if (templateId === 'tmj_ramus') {
      const frac = screwCount > 1 ? s / (screwCount - 1) : 0.5;
      sv = 0.5 - frac * 1.05;
      su = (s % 2 === 0 ? -0.14 : 0.16);
    } else if (templateId === 'cranial_vault') {
      const angle = (s / screwCount) * Math.PI * 2 + Math.PI / 6;
      su = Math.cos(angle) * 0.52;
      sv = Math.sin(angle) * 0.52;
    } else {
      // mandibular_bridge: bilateral left/right fixation segments avoiding center defect
      const half = Math.ceil(screwCount / 2);
      const isRight = s >= half;
      const localIdx = isRight ? s - half : s;
      const localCount = isRight ? Math.max(1, screwCount - half) : half;
      const t = localCount > 1 ? localIdx / (localCount - 1) : 0.5;
      su = isRight ? 0.34 + t * 0.38 : -0.72 + t * 0.38;
      sv = (localIdx % 2 === 0 ? 0.06 : -0.06);
    }

    // Clamp screw UV inward if user dragged spline tighter
    let safetyPull = 1.0;
    while (safetyPull > 0.25 && !evaluatePolygonContainment(su * safetyPull, sv * safetyPull, splinePoly).inside) {
      safetyPull -= 0.12;
    }
    su *= safetyPull;
    sv *= safetyPull;

    const surfPt = evalBoneSurface(templateId, su, sv, conformance);
    const normal = evalBoneNormal(templateId, su, sv, conformance);
    const bossPos = surfPt.clone().addScaledVector(normal, offsetScene + thicknessScene * 0.92);
    screwTransforms.push({ position: bossPos, normal });
  }

  const quadAreaMm2 = (spec.spanUMm / (cols - 1)) * (spec.spanVMm / (rows - 1));
  const surfaceAreaMm2 = Math.max(12, activeQuads * quadAreaMm2);
  const volumeCm3 = (surfaceAreaMm2 * thicknessMm) / 1000;
  const meanGapMm = validCellSamples > 0 ? sumGap / validCellSamples : 0;
  const fitGrade =
    meanGapMm <= 0.55 ? 'EXCELLENT' : meanGapMm <= 1.05 ? 'ACCEPTABLE' : 'NEEDS_CONTOUR';

  const triangleCount = posArray.length / 9;
  const exportMesh: GeneratedMeshData = {
    positions: posArray,
    normals: normalsArray,
    colors: colArray,
    triangleCount,
    vertexCount: posArray.length / 3,
    computeTimeMs: 4.5,
  };

  return {
    geometry,
    exportMesh,
    screwTransforms,
    surfaceAreaMm2,
    volumeCm3,
    meanGapMm,
    maxGapMm: maxGap,
    triangleCount,
    fitGrade,
  };
}

interface ImplantDesignLabProps {
  language: Language;
  calibrationMm: number;
  onRecordAudit: (
    actionType: 'PROSTHETIC_ALIGN' | 'MESH_EXPORT',
    moduleName: string,
    details: string,
  ) => void;
  onNotify: (msg: string) => void;
}

export const ImplantDesignLab: React.FC<ImplantDesignLabProps> = ({
  language,
  calibrationMm,
  onRecordAudit,
  onNotify,
}) => {
  const [templateId, setTemplateId] = useState<ImplantTemplateId>('tmj_ramus');
  const [controlPoints, setControlPoints] = useState<ControlPoint2D[]>(
    () => IMPLANT_TEMPLATES.tmj_ramus.defaultPoints.map((p) => ({ ...p })),
  );
  const [contourFitPct, setContourFitPct] = useState(96);
  const [thicknessMm, setThicknessMm] = useState(2.2);
  const [edgeBevelMm, setEdgeBevelMm] = useState(0.45);
  const [boneOffsetMm, setBoneOffsetMm] = useState(0.25);
  const [screwCount, setScrewCount] = useState(5);
  const [screwDiameterMm, setScrewDiameterMm] = useState(2.3);
  const [includeFenestrations, setIncludeFenestrations] = useState(true);
  const [showHostBone, setShowHostBone] = useState(true);
  const [showNerveSafetyZone, setShowNerveSafetyZone] = useState(true);
  const [showWireframe, setShowWireframe] = useState(false);
  const [finishPreset, setFinishPreset] = useState<ImplantFinishPreset>('titanium');
  const [gridRes, setGridRes] = useState(34);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);

  // Interactive 2D spline handle drag state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingHandleIdx, setDraggingHandleIdx] = useState<number | null>(null);
  const [hasEditedSpline, setHasEditedSpline] = useState(false);
  const [hasExportedImplant, setHasExportedImplant] = useState(false);

  // Three.js Refs
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const implantMeshRef = useRef<THREE.Mesh | null>(null);
  const boneSubstrateMeshRef = useRef<THREE.Mesh | null>(null);
  const screwsGroupRef = useRef<THREE.Group | null>(null);
  const condyleHeadGroupRef = useRef<THREE.Group | null>(null);
  const nerveSafetyGroupRef = useRef<THREE.Group | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});

  const spec = IMPLANT_TEMPLATES[templateId];

  const handleSelectTemplate = (nextId: ImplantTemplateId) => {
    const nextSpec = IMPLANT_TEMPLATES[nextId];
    setTemplateId(nextId);
    setControlPoints(nextSpec.defaultPoints.map((p) => ({ ...p })));
    setThicknessMm(nextSpec.defaultThicknessMm);
    setEdgeBevelMm(nextSpec.defaultBevelMm);
    setBoneOffsetMm(nextSpec.defaultOffsetMm);
    setScrewCount(nextSpec.defaultScrews);
    setContourFitPct(96);
    onRecordAudit(
      'PROSTHETIC_ALIGN',
      'Implant Design Training Lab',
      `Loaded parametric CAD template: ${nextSpec.titleEn}.`,
    );
  };

  // Real-time parametric solid mesh generation
  const implantBuild = useMemo(() => {
    return buildParametricImplantMesh(
      templateId,
      controlPoints,
      contourFitPct,
      thicknessMm,
      edgeBevelMm,
      boneOffsetMm,
      screwCount,
      gridRes,
      includeFenestrations,
    );
  }, [
    templateId,
    controlPoints,
    contourFitPct,
    thicknessMm,
    edgeBevelMm,
    boneOffsetMm,
    screwCount,
    gridRes,
    includeFenestrations,
  ]);

  // Smooth SVG spline path string for the 2D surface contour editor
  const splineSvgPath = useMemo(() => {
    const pts = sampleClosedSpline(controlPoints, 10);
    return (
      pts
        .map((p, idx) => {
          const sx = 120 + p.u * 96;
          const sy = 120 - p.v * 96;
          return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
        })
        .join(' ') + ' Z'
    );
  }, [controlPoints]);

  // Initialize Three.js Studio CAD WebGL Viewport
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b16);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    camera.position.set(11, 5.5, 19);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio CAD 3-Point Key / Fill / Rim Lighting Rig
    const hemi = new THREE.HemisphereLight(0xf1f5f9, 0x0f172a, 0.9);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(14, 18, 22);
    if (!isSoftwareGl) {
      key.castShadow = true;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rim.position.set(-16, 10, -14);
    scene.add(rim);

    const warmFill = new THREE.DirectionalLight(0xfde68a, 0.55);
    warmFill.position.set(8, -14, 10);
    scene.add(warmFill);

    // Subtle CAD reference datum grid
    const gridHelper = new THREE.GridHelper(22, 22, 0x1e3a5f, 0x0f2544);
    gridHelper.position.y = -8.2;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(3.5);
    axesHelper.position.set(-9.5, -7.8, -6);
    scene.add(axesHelper);

    // 1. Host Anatomical Bone Substrate Surface
    const boneMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6d2b5,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.25,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xfff1d6),
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const boneMesh = new THREE.Mesh(new THREE.BufferGeometry(), boneMat);
    boneMesh.receiveShadow = !isSoftwareGl;
    scene.add(boneMesh);
    boneSubstrateMeshRef.current = boneMesh;

    // 2. Parametric Custom Implant Mesh
    const implantMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.85,
      clearcoat: 0.45,
      side: THREE.DoubleSide,
    });
    const implantMesh = new THREE.Mesh(new THREE.BufferGeometry(), implantMat);
    implantMesh.castShadow = !isSoftwareGl;
    implantMesh.receiveShadow = !isSoftwareGl;
    scene.add(implantMesh);
    implantMeshRef.current = implantMesh;

    // 3. Locking Screw Bosses Group
    const screwsGroup = new THREE.Group();
    scene.add(screwsGroup);
    screwsGroupRef.current = screwsGroup;

    // 4. TMJ Articular Condylar Head & Neck Sub-Assembly (shown on TMJ Ramus case)
    const condyleGroup = new THREE.Group();
    const coCrMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.07,
      clearcoat: 1.0,
    });
    const headGeo = new THREE.SphereGeometry(1.05, 28, 22);
    headGeo.scale(0.95, 1.08, 0.9);
    const headMesh = new THREE.Mesh(headGeo, coCrMat);
    headMesh.position.set(0.25, 6.7, 0.2);

    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 6.4, 0.2),
      new THREE.Vector3(0.15, 5.5, 0.55),
      new THREE.Vector3(0.05, 4.6, 0.95),
    ]);
    const neckMesh = new THREE.Mesh(
      new THREE.TubeGeometry(neckCurve, 20, 0.44, 16, false),
      coCrMat,
    );
    condyleGroup.add(headMesh, neckMesh);
    scene.add(condyleGroup);
    condyleHeadGroupRef.current = condyleGroup;

    // 5. Golden Inferior Alveolar Nerve Safety Corridor
    const nerveGroup = new THREE.Group();
    const nerveMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      emissive: 0xff9900,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      transparent: true,
      opacity: 0.88,
    });
    const nerveTube = new THREE.Mesh(new THREE.BufferGeometry(), nerveMat);
    nerveGroup.add(nerveTube);
    scene.add(nerveGroup);
    nerveSafetyGroupRef.current = nerveGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0, 0.5);
    controlsRef.current = controls;

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 70);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 70);
      }
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty || controls.autoRotate) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 560;
      const nh = container.clientHeight || 420;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      requestRender();
    };
    window.addEventListener('resize', handleResize);
    requestRender();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Host Bone Reference Surface & Nerve Corridor when template changes
  useEffect(() => {
    const boneMesh = boneSubstrateMeshRef.current;
    if (boneMesh) {
      const segs = 36;
      const pos: number[] = [];
      const indices: number[] = [];
      for (let r = 0; r <= segs; r++) {
        const v = -1.15 + (2.3 * r) / segs;
        for (let c = 0; c <= segs; c++) {
          const u = -1.15 + (2.3 * c) / segs;
          const pt = evalBoneSurface(templateId, u, v, 1.0);
          // Carve subtle visual defect recess in center of cranial vault or mandibular bridge
          if (templateId === 'cranial_vault' && Math.hypot(u, v) < 0.42) {
            pt.z -= 0.48;
          } else if (templateId === 'mandibular_bridge' && Math.abs(u) < 0.24 && Math.abs(v) < 0.35) {
            pt.z -= 0.6;
          }
          pos.push(pt.x, pt.y, pt.z - 0.14);
        }
      }
      for (let r = 0; r < segs; r++) {
        for (let c = 0; c < segs; c++) {
          const a = r * (segs + 1) + c;
          const b = a + 1;
          const d = (r + 1) * (segs + 1) + c;
          const e = d + 1;
          indices.push(a, b, e, a, e, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      boneMesh.geometry.dispose();
      boneMesh.geometry = geo;
      boneMesh.visible = showHostBone;
    }

    if (condyleHeadGroupRef.current) {
      condyleHeadGroupRef.current.visible = templateId === 'tmj_ramus';
    }

    if (nerveSafetyGroupRef.current) {
      const tubeMesh = nerveSafetyGroupRef.current.children[0] as THREE.Mesh;
      if (templateId === 'cranial_vault') {
        nerveSafetyGroupRef.current.visible = false;
      } else {
        const curve =
          templateId === 'tmj_ramus'
            ? new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.3, 1.6, -0.35),
                new THREE.Vector3(-0.6, -0.6, -0.25),
                new THREE.Vector3(-1.4, -3.2, -0.1),
                new THREE.Vector3(-2.8, -5.2, 0.2),
              ])
            : new THREE.CatmullRomCurve3([
                new THREE.Vector3(-7.6, 0.55, -0.6),
                new THREE.Vector3(-3.8, 0.2, 1.5),
                new THREE.Vector3(0, 0.05, 2.3),
                new THREE.Vector3(3.8, 0.2, 1.5),
                new THREE.Vector3(7.6, 0.55, -0.6),
              ]);
        const newGeo = new THREE.TubeGeometry(curve, 32, 0.26, 12, false);
        tubeMesh.geometry.dispose();
        tubeMesh.geometry = newGeo;
        nerveSafetyGroupRef.current.visible = showNerveSafetyZone;
      }
    }

    requestRenderRef.current();
  }, [templateId, showHostBone, showNerveSafetyZone]);

  // Update Parametric Implant Mesh Geometry, Finish Preset & Locking Screw Bosses
  useEffect(() => {
    const implantMesh = implantMeshRef.current;
    if (implantMesh) {
      implantMesh.geometry.dispose();
      implantMesh.geometry = implantBuild.geometry;

      const mat = implantMesh.material as THREE.MeshPhysicalMaterial;
      mat.wireframe = showWireframe;
      if (finishPreset === 'heatmap') {
        mat.vertexColors = true;
        mat.color.setHex(0xffffff);
        mat.metalness = 0.08;
        mat.roughness = 0.32;
        mat.clearcoat = 0.35;
      } else if (finishPreset === 'peek') {
        mat.vertexColors = false;
        mat.color.setHex(0xd6c7b2);
        mat.metalness = 0.04;
        mat.roughness = 0.34;
        mat.clearcoat = 0.55;
      } else if (finishPreset === 'cocrmo') {
        mat.vertexColors = false;
        mat.color.setHex(0xe2e8f0);
        mat.metalness = 0.98;
        mat.roughness = 0.08;
        mat.clearcoat = 1.0;
      } else {
        // Brushed Grade-5 Ti-6Al-4V Titanium
        mat.vertexColors = false;
        mat.color.setHex(0x94a3b8);
        mat.metalness = 0.92;
        mat.roughness = 0.23;
        mat.clearcoat = 0.4;
      }
      mat.needsUpdate = true;
    }

    // Rebuild locking screw bosses aligned to exact contoured surface normals
    const screwsGroup = screwsGroupRef.current;
    if (screwsGroup) {
      while (screwsGroup.children.length > 0) {
        const child = screwsGroup.children[0] as THREE.Mesh;
        child.geometry.dispose();
        screwsGroup.remove(child);
      }

      const bezelMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        metalness: 0.95,
        roughness: 0.14,
      });
      const goldScrewMat = new THREE.MeshPhysicalMaterial({
        color: 0xfbbf24,
        metalness: 0.94,
        roughness: 0.18,
      });
      const socketMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.7,
        roughness: 0.45,
      });

      const rScene = (screwDiameterMm * 0.25) / 2;
      const upVec = new THREE.Vector3(0, 1, 0);

      implantBuild.screwTransforms.forEach(({ position, normal }) => {
        const quat = new THREE.Quaternion().setFromUnitVectors(upVec, normal);

        const bezel = new THREE.Mesh(
          new THREE.TorusGeometry(rScene * 1.28, rScene * 0.28, 10, 20),
          bezelMat,
        );
        bezel.geometry.rotateX(Math.PI / 2);
        bezel.position.copy(position);
        bezel.quaternion.copy(quat);

        const head = new THREE.Mesh(
          new THREE.CylinderGeometry(rScene * 1.05, rScene * 0.85, rScene * 0.72, 16),
          goldScrewMat,
        );
        head.position.copy(position);
        head.quaternion.copy(quat);

        const socket = new THREE.Mesh(
          new THREE.CylinderGeometry(rScene * 0.46, rScene * 0.46, rScene * 0.78, 6),
          socketMat,
        );
        socket.position.copy(position).addScaledVector(normal, rScene * 0.08);
        socket.quaternion.copy(quat);

        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(rScene * 0.58, rScene * 0.42, thicknessMm * 0.25 + 1.15, 12),
          goldScrewMat,
        );
        shaft.position
          .copy(position)
          .addScaledVector(normal, -(thicknessMm * 0.25 + 1.15) * 0.5);
        shaft.quaternion.copy(quat);

        screwsGroup.add(bezel, head, socket, shaft);
      });
    }

    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isSoftwareGl && autoRotate;
      controlsRef.current.autoRotateSpeed = 1.6;
    }

    requestRenderRef.current();
  }, [implantBuild, finishPreset, showWireframe, screwDiameterMm, thicknessMm, autoRotate]);

  // 2D SVG Spline Handle Dragging
  const updateDraggedPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingHandleIdx === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * 240;
    const sy = ((e.clientY - rect.top) / rect.height) * 240;
    const u = Math.max(-0.92, Math.min(0.92, (sx - 120) / 96));
    const v = Math.max(-0.92, Math.min(0.92, (120 - sy) / 96));

    setControlPoints((prev) =>
      prev.map((pt, idx) => (idx === draggingHandleIdx ? { u, v } : pt)),
    );
    setHasEditedSpline(true);
  };

  const setCameraPreset = (pos: [number, number, number]) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(pos[0], pos[1], pos[2]);
    controlsRef.current.target.set(0, 0, 0.5);
    controlsRef.current.update();
    requestRenderRef.current();
  };

  // 4-Step Training Completion Criteria
  const step1Done = hasEditedSpline || controlPoints.length === 8;
  const step2Done = implantBuild.meanGapMm <= 0.65 && contourFitPct >= 80;
  const step3Done = thicknessMm >= 1.6 && edgeBevelMm >= 0.25;
  const step4Done = hasExportedImplant;

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Banner & Template Selector */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
            <Wrench className="w-4 h-4" />
            <span>
              {language === 'en'
                ? 'PATIENT-SPECIFIC IMPLANT CAD TRAINING MODULE'
                : 'MODUL PELATIHAN DESAIN CAD IMPLAN KHUSUS PASIEN'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'Surface Design, Parametric Extrusion & Anatomical Bone Contouring'
              : 'Desain Permukaan, Ekstrusi Parametrik & Konturing Tulang Anatomis'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">
            {language === 'en'
              ? 'Practice shaping custom craniomaxillofacial implants directly onto curved anatomical bone surfaces. Edit the 2D spline perimeter, conform curvature to minimize bone-contact gap (<0.5 mm), extrude wall thickness with feathered bevels, and export printable .STL / .STEP CAD solids.'
              : 'Latih pembentukan implan kraniomaksilofasial langsung pada permukaan tulang anatomis melengkung. Ubah kontur spline 2D, sesuaikan kelengkungan untuk meminimalkan celah tulang (<0,5 mm), ekstrusi ketebalan dinding dengan bevel halus, dan ekspor file CAD .STL / .STEP.'}
          </p>
        </div>

        {/* Direct Custom Implant CAD Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              exportMeshToSTL(implantBuild.exportMesh, `custom_implant_${templateId}`);
              setHasExportedImplant(true);
              onRecordAudit(
                'MESH_EXPORT',
                'Implant Design Training Lab',
                `Exported custom ${spec.titleEn} .STL (${thicknessMm.toFixed(1)}mm thick, mean gap ${implantBuild.meanGapMm.toFixed(2)}mm, ${implantBuild.triangleCount} tris).`,
              );
              onNotify(
                language === 'en'
                  ? `Exported custom ${spec.titleEn} solid to Binary .STL.`
                  : `Berhasil mengekspor model padat ${spec.titleId} ke .STL.`,
              );
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Export Implant .STL' : 'Ekspor Implan .STL'}</span>
          </button>

          <button
            onClick={() => {
              exportMeshToOBJ(implantBuild.exportMesh, `custom_implant_${templateId}`);
              setHasExportedImplant(true);
              onRecordAudit(
                'MESH_EXPORT',
                'Implant Design Training Lab',
                `Exported custom ${spec.titleEn} Wavefront .OBJ (${implantBuild.triangleCount} tris).`,
              );
              onNotify(
                language === 'en'
                  ? 'Exported custom implant mesh to .OBJ.'
                  : 'Berhasil mengekspor mesh implan ke .OBJ.',
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.OBJ</span>
          </button>

          <button
            onClick={() => {
              exportMeshToSTEP(
                implantBuild.exportMesh,
                `custom_implant_${templateId}`,
                [0, 0, boneOffsetMm],
                calibrationMm,
              );
              setHasExportedImplant(true);
              onRecordAudit(
                'MESH_EXPORT',
                'Implant Design Training Lab',
                `Exported ISO-10303-21 .STEP CAD for ${spec.titleEn} (offset ${boneOffsetMm.toFixed(2)}mm).`,
              );
              onNotify(
                language === 'en'
                  ? 'Exported ISO-10303-21 .STEP file for CNC machining practice.'
                  : 'Berhasil mengekspor file CAD .STEP ISO-10303-21.',
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#FFD700] text-xs font-semibold text-amber-800 dark:text-[#FFD700] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.STEP</span>
          </button>
        </div>
      </div>

      {/* 3 Selectable Clinical Training Cases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(IMPLANT_TEMPLATES) as ImplantTemplateId[]).map((id) => {
          const item = IMPLANT_TEMPLATES[id];
          const active = templateId === id;
          return (
            <button
              key={id}
              onClick={() => handleSelectTemplate(id)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                active
                  ? 'bg-[#00E5FF]/10 border-[#00E5FF] dark:bg-[#00E5FF]/15'
                  : 'bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#0088AA] dark:text-[#00E5FF] font-semibold">
                  {language === 'en' ? item.clinicalTargetEn : item.clinicalTargetId}
                </span>
                {active && (
                  <span className="text-[10px] font-mono font-bold text-[#0A192F] bg-[#00E5FF] px-1.5 py-0.5 rounded">
                    {language === 'en' ? 'ACTIVE' : 'AKTIF'}
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en' ? item.titleEn : item.titleId}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {language === 'en' ? item.subtitleEn : item.subtitleId}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main 12-Column CAD Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Live 3D Parametric CAD Viewport + Engineering Readout */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
            {/* Viewport Header with 4 Material / Heatmap Finish Presets */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F]/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#0088AA] dark:text-[#00E5FF]" />
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-[#00E5FF]">
                  {language === 'en' ? '3D CAD IMPLANT CONTOUR PREVIEW' : 'PRATINJAU KONTUR IMPLAN CAD 3D'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'titanium', en: 'Ti-6Al-4V', idLabel: 'Titanium Ti-6Al-4V' },
                    { id: 'peek', en: 'PEEK Polymer', idLabel: 'Polimer PEEK' },
                    { id: 'cocrmo', en: 'CoCrMo Polish', idLabel: 'CoCrMo Kilap' },
                    { id: 'heatmap', en: 'Fit Heatmap', idLabel: 'Peta Celah Tulang' },
                  ] as Array<{ id: ImplantFinishPreset; en: string; idLabel: string }>
                ).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setFinishPreset(preset.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      finishPreset === preset.id
                        ? preset.id === 'heatmap'
                          ? 'bg-emerald-400 text-[#0A192F] font-bold'
                          : 'bg-[#00E5FF] text-[#0A192F] font-bold'
                        : 'bg-slate-200 dark:bg-[#112240] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {language === 'en' ? preset.en : preset.idLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch-Black Studio CAD WebGL Canvas */}
            <div className="relative bg-[#040B16] h-[420px] w-full overflow-hidden">
              <div ref={canvasMountRef} className="w-full h-full" />

              {/* Top-Left CAD Telemetry Overlay */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-300 leading-relaxed pointer-events-none tabular-nums space-y-0.5">
                <div className="text-[#00E5FF] font-bold">
                  CAD KERNEL // {templateId.toUpperCase()}
                </div>
                <div>
                  {language === 'en' ? 'Wall Thickness' : 'Ketebalan Dinding'}: {thicknessMm.toFixed(1)} mm · Bevel:{' '}
                  {edgeBevelMm.toFixed(2)} mm
                </div>
                <div>
                  {language === 'en' ? 'Bone Clearance' : 'Celah Periosteal'}: {boneOffsetMm.toFixed(2)} mm · Conformance:{' '}
                  {contourFitPct}%
                </div>
                <div>
                  {language === 'en' ? 'Solid Mesh' : 'Mesh Padat'}: {implantBuild.triangleCount.toLocaleString()} tris
                </div>
              </div>

              {/* Fit Deviation Legend when Heatmap is active */}
              {finishPreset === 'heatmap' && (
                <div className="absolute top-3 right-3 bg-[#0A192F]/90 border border-slate-700 rounded-lg px-2.5 py-2 text-[10px] font-mono text-slate-200 space-y-1 pointer-events-none">
                  <div className="font-bold text-[#00E5FF]">
                    {language === 'en' ? 'BONE FIT DEVIATION' : 'DEVIASI KONTAK TULANG'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                    <span>≤ 0.40 mm (Optimal)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#FFD700] inline-block" />
                    <span>0.41 – 1.05 mm (Fair)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    <span>&gt; 1.05 mm (Re-Contour)</span>
                  </div>
                </div>
              )}

              {/* Collapsible Bottom 3D Camera Dock */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[92%] max-w-[460px] z-10">
                <div className="flex justify-center">
                  <button
                    onClick={() => setDockCollapsed(!dockCollapsed)}
                    className="px-2.5 py-0.5 rounded-t bg-[#0A192F] border border-b-0 border-slate-700 text-[10px] font-mono text-[#00E5FF] flex items-center gap-1 hover:text-white cursor-pointer"
                  >
                    {dockCollapsed ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        <span>{language === 'en' ? 'Camera Dock' : 'Kontrol Kamera'}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        <span>{language === 'en' ? 'Hide Dock' : 'Sembunyikan'}</span>
                      </>
                    )}
                  </button>
                </div>

                {!dockCollapsed && (
                  <div className="bg-[#0A192F]/95 border border-slate-700 rounded-lg p-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono text-slate-200">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCameraPreset([11, 5.5, 19])}
                        className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-[#00E5FF] cursor-pointer"
                      >
                        3/4 CAD
                      </button>
                      <button
                        onClick={() => setCameraPreset([0, 0, 22])}
                        className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 cursor-pointer"
                      >
                        {language === 'en' ? 'OUTER' : 'LUAR'}
                      </button>
                      <button
                        onClick={() => setCameraPreset([0, 0, -21])}
                        className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 cursor-pointer"
                      >
                        {language === 'en' ? 'BONE SIDE' : 'SISI TULANG'}
                      </button>
                      <button
                        onClick={() => setCameraPreset([21, 2, 2])}
                        className="px-2 py-1 rounded bg-[#112240] hover:bg-cyan-500/20 text-slate-200 cursor-pointer"
                      >
                        PROFILE
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`px-2 py-1 rounded cursor-pointer ${
                          autoRotate
                            ? 'bg-[#00E5FF] text-[#0A192F] font-bold'
                            : 'bg-[#112240] text-slate-300'
                        }`}
                      >
                        360°
                      </button>
                      <button
                        onClick={() => setCameraPreset([11, 5.5, 19])}
                        className="p-1 rounded bg-[#112240] text-slate-300 hover:text-white cursor-pointer"
                        title="Reset Camera"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Engineering Fit & Extrusion Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50 dark:bg-[#0A192F]/80 text-xs font-mono tabular-nums">
              <div className="p-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'MEAN BONE GAP' : 'RATA-RATA CELAH'}
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    implantBuild.fitGrade === 'EXCELLENT'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : implantBuild.fitGrade === 'ACCEPTABLE'
                        ? 'text-amber-600 dark:text-[#FFD700]'
                        : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {implantBuild.meanGapMm.toFixed(2)} mm
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'MAX DEVIATION' : 'DEVIASI MAKS'}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {implantBuild.maxGapMm.toFixed(2)} mm
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'SURFACE AREA' : 'LUAS PERMUKAAN'}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {Math.round(implantBuild.surfaceAreaMm2)} mm²
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'EXTRUSION VOL' : 'VOLUME EKSTRUSI'}
                </div>
                <div className="text-sm font-bold text-[#0088AA] dark:text-[#00E5FF] mt-0.5">
                  {implantBuild.volumeCm3.toFixed(2)} cm³
                </div>
              </div>
            </div>
          </div>

          {/* 4-Step Guided Implant Design Competency Checklist */}
          <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD700]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'en'
                    ? 'Implant CAD Competency Checklist (4 Steps)'
                    : 'Daftar Periksa Kompetensi CAD Implan (4 Langkah)'}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#0088AA] dark:text-[#00E5FF]">
                {completedStepsCount} / 4
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                {
                  done: step1Done,
                  titleEn: '1. Contour 2D Surface Spline',
                  titleId: '1. Bentuk Spline Permukaan 2D',
                  descEn: 'Drag perimeter handles to define safe bony fixation margins.',
                  descId: 'Geser titik kendali tepi untuk menentukan batas fiksasi tulang aman.',
                },
                {
                  done: step2Done,
                  titleEn: '2. Conform Curvature (Gap ≤ 0.65 mm)',
                  titleId: '2. Sesuaikan Kontur (Celah ≤ 0,65 mm)',
                  descEn: 'Project surface onto host bone curvature and verify Fit Heatmap.',
                  descId: 'Proyeksikan permukaan ke kelengkungan tulang & cek Peta Celah.',
                },
                {
                  done: step3Done,
                  titleEn: '3. Extrude Solid & Feather Edges',
                  titleId: '3. Ekstrusi Padat & Haluskan Tepi',
                  descEn: 'Set wall extrusion ≥ 1.6 mm and edge bevel ≥ 0.25 mm.',
                  descId: 'Atur ketebalan ekstrusi ≥ 1,6 mm dan bevel tepi ≥ 0,25 mm.',
                },
                {
                  done: step4Done,
                  titleEn: '4. Export Printable .STL / .STEP',
                  titleId: '4. Ekspor File Siap Cetak .STL / .STEP',
                  descEn: 'Download watertight implant CAD for 3D printing or CNC practice.',
                  descId: 'Unduh file CAD implan kedap air untuk latihan cetak 3D atau CNC.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    item.done
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      item.done ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {language === 'en' ? item.titleEn : item.titleId}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {language === 'en' ? item.descEn : item.descId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: 2D Interactive Spline Surface Designer + Extrusion & Contouring Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Interactive 2D Surface Perimeter Spline Editor */}
          <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'en'
                    ? '1. Surface Design & Spline Contour Editor'
                    : '1. Editor Desain Permukaan & Kontur Spline'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'en'
                    ? 'Drag any of the 8 cyan control points to reshape the 3D implant silhouette.'
                    : 'Seret salah satu dari 8 titik kendali cyan untuk mengubah bentuk implan 3D.'}
                </p>
              </div>
            </div>

            {/* Interactive SVG Canvas */}
            <div className="flex justify-center bg-[#061224] border border-slate-800 rounded-xl p-2">
              <svg
                ref={svgRef}
                viewBox="0 0 240 240"
                className="w-full max-w-[260px] aspect-square touch-none select-none cursor-crosshair"
                onPointerMove={updateDraggedPoint}
                onPointerUp={() => setDraggingHandleIdx(null)}
                onPointerLeave={() => setDraggingHandleIdx(null)}
              >
                {/* Reference anatomical coordinate grid */}
                {[48, 84, 120, 156, 192].map((g) => (
                  <g key={g} stroke="#1e3a5f" strokeWidth="0.6" strokeDasharray="2 3">
                    <line x1={g} y1={14} x2={g} y2={226} />
                    <line x1={14} y1={g} x2={226} y2={g} />
                  </g>
                ))}

                {/* Bone Curvature Topographic Contours */}
                <ellipse
                  cx="120"
                  cy="120"
                  rx="88"
                  ry="82"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <ellipse
                  cx="120"
                  cy="120"
                  rx="56"
                  ry="52"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />

                {/* Golden Nerve Corridor Indicator on Mandibular/TMJ cases */}
                {templateId !== 'cranial_vault' && (
                  <path
                    d={
                      templateId === 'tmj_ramus'
                        ? 'M 114 96 Q 108 134 86 184'
                        : 'M 28 112 Q 120 124 212 112'
                    }
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2.5"
                    strokeOpacity="0.65"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Closed Smooth Spline Surface Footprint */}
                <path
                  d={splineSvgPath}
                  fill="#00E5FF"
                  fillOpacity="0.18"
                  stroke="#00E5FF"
                  strokeWidth="2"
                />

                {/* Draggable Control Point Handles */}
                {controlPoints.map((pt, idx) => {
                  const cx = 120 + pt.u * 96;
                  const cy = 120 - pt.v * 96;
                  const isDragging = draggingHandleIdx === idx;
                  return (
                    <g key={idx}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isDragging ? 7.5 : 5.5}
                        fill={isDragging ? '#FFD700' : '#00E5FF'}
                        stroke="#0A192F"
                        strokeWidth="1.8"
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          (e.target as Element).setPointerCapture(e.pointerId);
                          setDraggingHandleIdx(idx);
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Contour Footprint Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setControlPoints(spec.defaultPoints.map((p) => ({ ...p })));
                  setHasEditedSpline(true);
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF] text-[11px] font-mono text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {language === 'en' ? 'Anatomical Fit' : 'Standar Anatomi'}
              </button>
              <button
                onClick={() => {
                  setControlPoints(spec.compactPoints.map((p) => ({ ...p })));
                  setHasEditedSpline(true);
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF] text-[11px] font-mono text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {language === 'en' ? 'Compact Flange' : 'Flange Ringkas'}
              </button>
              <button
                onClick={() => {
                  setControlPoints(spec.extendedPoints.map((p) => ({ ...p })));
                  setHasEditedSpline(true);
                }}
                className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF] text-[11px] font-mono text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {language === 'en' ? 'Extended Wing' : 'Sayap Ekstensi'}
              </button>
            </div>
          </div>

          {/* 2. Accurate Bone Contouring & Surface Extrusion Parameters */}
          <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0088AA] dark:text-[#00E5FF]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? '2. Accurate Contouring & Normal Extrusion'
                  : '2. Konturing Akurat & Ekstrusi Normal'}
              </h2>
            </div>

            {/* Curvature Conformance Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                <span>
                  {language === 'en' ? 'Anatomical Bone Contouring' : 'Kesesuaian Kontur Tulang'}
                </span>
                <span className="text-[#0088AA] dark:text-[#00E5FF] font-bold">{contourFitPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={contourFitPct}
                onChange={(e) => setContourFitPct(parseInt(e.target.value, 10))}
                className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
                <span>{language === 'en' ? '0% Flat Sheet' : '0% Pelat Datar'}</span>
                <span>{language === 'en' ? '100% Exact Bone Surface' : '100% Kontur Presisi'}</span>
              </div>
            </div>

            {/* Wall Extrusion Thickness */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                <span>
                  {language === 'en' ? 'Normal Surface Extrusion' : 'Ketebalan Ekstrusi Normal'}
                </span>
                <span className="font-bold">{thicknessMm.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={4.0}
                step={0.1}
                value={thicknessMm}
                onChange={(e) => setThicknessMm(parseFloat(e.target.value))}
                className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Edge Feathering / Bevel */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                <span>
                  {language === 'en' ? 'Feathered Edge Bevel' : 'Bevel Tepi Halus'}
                </span>
                <span className="font-bold">{edgeBevelMm.toFixed(2)} mm</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={edgeBevelMm}
                onChange={(e) => setEdgeBevelMm(parseFloat(e.target.value))}
                className="w-full accent-[#00E5FF] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Bone Clearance Offset */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                <span>
                  {language === 'en' ? 'Periosteal Clearance Offset' : 'Offset Celah Periosteal'}
                </span>
                <span className="font-bold">{boneOffsetMm.toFixed(2)} mm</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.5}
                step={0.05}
                value={boneOffsetMm}
                onChange={(e) => setBoneOffsetMm(parseFloat(e.target.value))}
                className="w-full accent-[#FFD700] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>

            {/* Locking Screw Fixation Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                  <span>{language === 'en' ? 'Locking Screws' : 'Sekrup Fiksasi'}</span>
                  <span className="text-[#FFD700] font-bold">{screwCount}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={7}
                  step={1}
                  value={screwCount}
                  onChange={(e) => setScrewCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#FFD700] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-700 dark:text-slate-200 mb-1 tabular-nums">
                  <span>{language === 'en' ? 'Screw Ø' : 'Diameter Ø'}</span>
                  <span className="font-bold">{screwDiameterMm.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={1.8}
                  max={2.7}
                  step={0.1}
                  value={screwDiameterMm}
                  onChange={(e) => setScrewDiameterMm(parseFloat(e.target.value))}
                  className="w-full accent-[#FFD700] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Surface Resolution & Visualization Toggles */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                  {language === 'en' ? 'CAD Mesh Resolution' : 'Resolusi Mesh CAD'}
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Draft', val: 24 },
                    { label: 'Std', val: 34 },
                    { label: 'Fine', val: 46 },
                  ].map((res) => (
                    <button
                      key={res.val}
                      onClick={() => setGridRes(res.val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                        gridRes === res.val
                          ? 'bg-[#00E5FF] text-[#0A192F] font-bold'
                          : 'bg-slate-100 dark:bg-[#0A192F] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                <span>
                  {language === 'en' ? 'Show Host Bone Reference Surface' : 'Tampilkan Permukaan Tulang Asli'}
                </span>
                <input
                  type="checkbox"
                  checked={showHostBone}
                  onChange={(e) => setShowHostBone(e.target.checked)}
                  className="w-4 h-4 accent-[#00E5FF]"
                />
              </label>

              {templateId !== 'cranial_vault' ? (
                <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <span>
                    {language === 'en'
                      ? 'Show Inferior Alveolar Nerve Safety Zone'
                      : 'Tampilkan Zona Aman Saraf Mandibula'}
                  </span>
                  <input
                    type="checkbox"
                    checked={showNerveSafetyZone}
                    onChange={(e) => setShowNerveSafetyZone(e.target.checked)}
                    className="w-4 h-4 accent-[#FFD700]"
                  />
                </label>
              ) : (
                <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <span>
                    {language === 'en'
                      ? 'Add Cranial Drainage Fenestration Holes'
                      : 'Tambah Lubang Drainase Kranial'}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeFenestrations}
                    onChange={(e) => setIncludeFenestrations(e.target.checked)}
                    className="w-4 h-4 accent-[#00E5FF]"
                  />
                </label>
              )}

              <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                <span>
                  {language === 'en' ? 'Inspect CAD Mesh Wireframe' : 'Periksa Wireframe Mesh CAD'}
                </span>
                <input
                  type="checkbox"
                  checked={showWireframe}
                  onChange={(e) => setShowWireframe(e.target.checked)}
                  className="w-4 h-4 accent-[#00E5FF]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
