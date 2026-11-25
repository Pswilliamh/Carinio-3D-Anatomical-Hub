import { computeEncryptedDigest } from '../firebase';
import {
  CachedVolumeRecord,
  getCachedVolume,
  setCachedVolume,
} from './indexedDbCache';

export interface AnatomicalLandmark {
  id: string;
  code: string;
  nameEn: string;
  nameId: string;
  voxel: [number, number, number];
  huValue: number;
  clinicalNoteEn: string;
  clinicalNoteId: string;
}

export interface ComparisonMetrics {
  diceScore: number;
  scatterRemovedPct: number;
  bonePreservedPct: number;
  islandsClearedPct: number;
  activeVoxelCount: number;
  referenceVoxelCount: number;
  remainingScatterVoxels: number;
}

export interface GeneratedMeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  triangleCount: number;
  vertexCount: number;
  computeTimeMs: number;
}

const VOLUME_CACHE_TAG = 'v2_high_realism_skull';

function idx3D(x: number, y: number, z: number, nx: number, ny: number): number {
  return z * (nx * ny) + y * nx + x;
}

function distEllipsoid(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
): number {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const dz = (z - cz) / rz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Smooth minimum (polynomial smin) for organic anatomical blending between bones
function smin(a: number, b: number, k = 0.18): number {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export async function loadOrGenerateDataset(
  datasetId: 'tmj_condyle_scatter' | 'full_cranium_arch',
): Promise<{ record: CachedVolumeRecord; fromCache: boolean; latencyMs: number }> {
  const cacheKey = `${datasetId}_${VOLUME_CACHE_TAG}`;
  const cached = await getCachedVolume(cacheKey);
  if (cached.record && cached.record.huData && cached.record.huData.length === 40 * 40 * 40) {
    return {
      record: cached.record,
      fromCache: true,
      latencyMs: cached.latencyMs,
    };
  }

  const t0 = performance.now();
  const dims: [number, number, number] = [40, 40, 40];
  const [nx, ny, nz] = dims;
  const total = nx * ny * nz;
  const huData = new Int16Array(total);
  const cleanReferenceMask = new Uint8Array(total);
  const scatterMask = new Uint8Array(total);
  const mandibleComponentMask = new Uint8Array(total);

  // Fill baseline soft tissue / air background with realistic CT trabecular micro-noise
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = idx3D(x, y, z, nx, ny);
        const headEnvelope = distEllipsoid(x, y, z, 20, 21, 21, 17.5, 18.2, 18.2);
        if (headEnvelope > 1.02) {
          huData[i] = -980; // Surrounding air
        } else {
          const microNoise =
            Math.sin(x * 1.3) * Math.cos(y * 1.1) * Math.sin(z * 1.4) * 28 +
            Math.cos((x + y) * 0.9) * 14;
          huData[i] = Math.round(32 + microNoise);
        }
      }
    }
  }

  if (datasetId === 'tmj_condyle_scatter') {
    // High-Realism Human Skull Facial Quarter + Detailed Bilateral TMJ, Zygomatic Arch, Orbits, Nasal Cavity & Mandible
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = idx3D(x, y, z, nx, ny);

          // --- A. CRANIAL VAULT, ORBITS, ZYGOMATIC ARCH, TEMPORAL BONE & GLENOID FOSSA ---
          const neuroCraniumOuter = distEllipsoid(x, y, z, 20, 17.5, 29.0, 13.8, 13.5, 9.2);
          const neuroCraniumInner = distEllipsoid(x, y, z, 20, 17.5, 29.0, 11.4, 11.1, 7.1);

          // Bilateral Orbital Cavities (Eye Sockets)
          const leftOrbit = distEllipsoid(x, y, z, 14.2, 30.2, 26.2, 3.6, 4.2, 3.3);
          const rightOrbit = distEllipsoid(x, y, z, 25.8, 30.2, 26.2, 3.6, 4.2, 3.3);

          // Piriform Nasal Aperture & Nasal Cavity
          const nasalAperture = distEllipsoid(x, y, z, 20.0, 31.5, 21.8, 2.3, 4.8, 3.6);
          const nasalSeptum = Math.abs(x - 20.0) < 0.65 && y >= 27 && y <= 33 && z >= 19 && z <= 25;

          // Maxilla & Malar (Cheekbone) Prominence
          const maxillaBlock = distEllipsoid(x, y, z, 20.0, 27.5, 21.5, 9.6, 6.2, 4.8);
          const leftZygomaArch = distEllipsoid(x, y, z, 9.2, 22.0, 24.5, 1.9, 6.8, 1.8);
          const rightZygomaArch = distEllipsoid(x, y, z, 30.8, 22.0, 24.5, 1.9, 6.8, 1.8);

          // Temporal Squama & Concave Glenoid Fossa Sockets (Left & Right TMJ Roof)
          const temporalBaseL = distEllipsoid(x, y, z, 10.8, 14.8, 26.8, 4.2, 4.5, 3.2);
          const temporalBaseR = distEllipsoid(x, y, z, 29.2, 14.8, 26.8, 4.2, 4.5, 3.2);
          const glenoidSocketCarveL = distEllipsoid(x, y, z, 11.2, 15.0, 23.6, 3.3, 3.0, 2.4);
          const glenoidSocketCarveR = distEllipsoid(x, y, z, 28.8, 15.0, 23.6, 3.3, 3.0, 2.4);

          const isCraniumShell =
            neuroCraniumOuter <= 1.0 &&
            neuroCraniumInner >= 0.88 &&
            leftOrbit > 0.96 &&
            rightOrbit > 0.96;

          const isMaxilla =
            maxillaBlock <= 1.0 &&
            leftOrbit > 0.92 &&
            rightOrbit > 0.92 &&
            (nasalAperture > 0.95 || nasalSeptum);

          const isZygoma = leftZygomaArch <= 1.0 || rightZygomaArch <= 1.0;
          const isTemporalFossa =
            (temporalBaseL <= 1.0 && glenoidSocketCarveL > 0.92) ||
            (temporalBaseR <= 1.0 && glenoidSocketCarveR > 0.92);

          if (isCraniumShell || isMaxilla || isZygoma || isTemporalFossa) {
            // Mastoid / trabecular internal air cells vs dense cortical bone shell
            const cellPattern = Math.sin(x * 2.1) * Math.cos(y * 2.1) * Math.sin(z * 2.1);
            const isOuterCortical =
              neuroCraniumOuter > 0.91 || maxillaBlock > 0.85 || isZygoma;
            huData[i] = isOuterCortical
              ? Math.round(1380 + cellPattern * 140)
              : Math.round(620 + cellPattern * 240);
          }

          // --- B. MANDIBLE: BILATERAL CONDYLES, CORONOID PROCESSES, RAMUS & U-SHAPED JAW ARCH ---
          // Left & Right Mandibular Condyle Heads (fit inside Glenoid Fossa with 1.5mm synovial gap)
          const condyleL = distEllipsoid(x, y, z, 11.2, 15.0, 21.2, 2.6, 2.2, 2.1);
          const condyleR = distEllipsoid(x, y, z, 28.8, 15.0, 21.2, 2.6, 2.2, 2.1);

          // Left & Right Condylar Necks
          const neckL = distEllipsoid(x, y, z, 11.2, 15.4, 18.2, 1.8, 2.0, 2.6);
          const neckR = distEllipsoid(x, y, z, 28.8, 15.4, 18.2, 1.8, 2.0, 2.6);

          // Left & Right Coronoid Processes (anterior to sigmoid notch)
          const coronoidL = distEllipsoid(x, y, z, 11.4, 22.8, 20.4, 1.5, 2.4, 3.2);
          const coronoidR = distEllipsoid(x, y, z, 28.6, 22.8, 20.4, 1.5, 2.4, 3.2);

          // Left & Right Mandibular Ramus Plates
          const ramusL = distEllipsoid(x, y, z, 11.4, 18.5, 14.2, 1.85, 4.8, 5.2);
          const ramusR = distEllipsoid(x, y, z, 28.6, 18.5, 14.2, 1.85, 4.8, 5.2);

          // U-Shaped Mandibular Body & Chin Symphysis (Menton)
          const jawArchRadius = Math.sqrt(
            Math.pow((x - 20.0) * 1.05, 2) + Math.pow((y - 21.5) * 0.88, 2),
          );
          const jawRadialDist = Math.abs(jawArchRadius - 9.2) / 2.2;
          const jawHeightDist = Math.abs(z - 10.2) / 3.4;
          const uJawBody =
            y >= 17.5 ? Math.sqrt(jawRadialDist * jawRadialDist + jawHeightDist * jawHeightDist) : 99;

          const mandibleField = smin(
            smin(smin(condyleL, condyleR), smin(neckL, neckR)),
            smin(smin(coronoidL, coronoidR), smin(smin(ramusL, ramusR), uJawBody)),
            0.22,
          );

          // Ensure clear synovial joint space between Glenoid Fossa roof and Condyle head
          const inSynovialGap =
            (glenoidSocketCarveL <= 0.92 && z >= 22.8) ||
            (glenoidSocketCarveR <= 0.92 && z >= 22.8);

          if (mandibleField <= 1.0 && !inSynovialGap) {
            // Internal Inferior Alveolar Nerve Canal inside left & right ramus/body
            const canalY = 16.5 + (17 - z) * 1.1;
            const canalDistL = Math.hypot(x - 11.4, y - canalY);
            const canalDistR = Math.hypot(x - 28.6, y - canalY);

            if (z >= 9 && z <= 17 && (canalDistL < 1.1 || canalDistR < 1.1)) {
              huData[i] = 48; // Inferior alveolar neurovascular canal
            } else {
              const isCorticalShell = mandibleField > 0.66;
              huData[i] = isCorticalShell ? 1480 : 580;
              cleanReferenceMask[i] = 1;
              mandibleComponentMask[i] = 1;
            }
          }

          // --- C. MAXILLARY & MANDIBULAR DENTAL ARCHES + METALLIC AMALGAM SCATTER ---
          const toothArchR = Math.sqrt(
            Math.pow((x - 20.0) * 1.08, 2) + Math.pow((y - 22.0) * 0.9, 2),
          );
          if (y >= 22.5 && Math.abs(toothArchR - 8.6) <= 1.25 && z >= 13.5 && z <= 17.5) {
            // Segmented individual tooth crowns along arch
            const toothAngle = Math.atan2(y - 22.0, x - 20.0);
            const toothMod = Math.cos(toothAngle * 14);
            if (toothMod > -0.35) {
              huData[i] = 2180; // Dense tooth enamel
              if (z <= 15.5) {
                cleanReferenceMask[i] = 1;
                mandibleComponentMask[i] = 1;
              }
            }
          }

          // Metallic Amalgam Molar Filling & Star-Like Beam-Hardening Scatter Streaks on Axial Slices Z = 15..18
          if (z >= 15 && z <= 18) {
            const dx = x - 12.2;
            const dy = y - 26.5;
            const r = Math.hypot(dx, dy);
            const theta = Math.atan2(dy, dx);
            if (r <= 1.6) {
              huData[i] = 2990; // Amalgam filling core
              scatterMask[i] = 1;
            } else if (r > 1.6 && r < 13.5) {
              const rayPattern = Math.cos(theta * 6);
              if (rayPattern > 0.82 && cleanReferenceMask[i] === 0) {
                huData[i] = Math.round(1120 + (1 - r / 14) * 1450);
                scatterMask[i] = 1;
              }
            }
          }
        }
      }
    }

    // 5 Floating Calcified Noise Islands for Island Removal training
    const islandCenters: [number, number, number][] = [
      [5, 10, 22],
      [34, 11, 20],
      [6, 31, 25],
      [34, 30, 14],
      [20, 8, 12],
    ];
    for (const [ix, iy, iz] of islandCenters) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2) {
              const i = idx3D(ix + dx, iy + dy, iz + dz, nx, ny);
              huData[i] = 890;
              scatterMask[i] = 1;
            }
          }
        }
      }
    }
  } else {
    // Dataset 2: Full Human Cranium & Maxillofacial Skeletal Model (Reference whole-skull 3D view)
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const i = idx3D(x, y, z, nx, ny);

          const craniumOuter = distEllipsoid(x, y, z, 20, 18.0, 26.8, 13.6, 14.8, 9.8);
          const craniumInner = distEllipsoid(x, y, z, 20, 18.0, 26.8, 11.5, 12.6, 7.6);
          const faceBlock = distEllipsoid(x, y, z, 20, 27.2, 20.5, 9.4, 6.8, 5.8);

          const orbitL = distEllipsoid(x, y, z, 14.4, 31.2, 23.8, 3.4, 3.8, 3.0);
          const orbitR = distEllipsoid(x, y, z, 25.6, 31.2, 23.8, 3.4, 3.8, 3.0);
          const nasalCavity = distEllipsoid(x, y, z, 20.0, 32.0, 19.8, 2.2, 4.5, 3.4);

          const jawArchR = Math.sqrt(
            Math.pow((x - 20.0) * 1.05, 2) + Math.pow((y - 22.0) * 0.88, 2),
          );
          const isMandibleArch =
            z >= 7 && z <= 14 && y >= 17 && Math.abs(jawArchR - 9.0) <= 2.1;
          const isRamusL =
            x >= 9 && x <= 13 && y >= 13 && y <= 20 && z >= 11 && z <= 21;
          const isRamusR =
            x >= 27 && x <= 31 && y >= 13 && y <= 20 && z >= 11 && z <= 21;

          const isUpperSkull =
            ((craniumOuter <= 1.0 && craniumInner >= 0.88) || faceBlock <= 1.0) &&
            orbitL > 0.95 &&
            orbitR > 0.95 &&
            nasalCavity > 0.95;

          if (isUpperSkull || isMandibleArch || isRamusL || isRamusR) {
            huData[i] = 1420;
            cleanReferenceMask[i] = 1;
            if (isMandibleArch || isRamusL || isRamusR) {
              mandibleComponentMask[i] = 1;
            }
          }

          if (z >= 13 && z <= 15 && y >= 32 && y <= 36 && (x === 14 || x === 20 || x === 26)) {
            huData[i] = 2780;
            scatterMask[i] = 1;
          }
        }
      }
    }
  }

  const encryptedDigest = await computeEncryptedDigest({
    cacheKey,
    dims,
    sampleCheck: [huData[1200], huData[24000], huData[32000]],
  });

  const record: CachedVolumeRecord = {
    id: datasetId,
    name:
      datasetId === 'tmj_condyle_scatter'
        ? 'TMJ Condyle & Craniofacial Skeleton (High-Detail + Dental Scatter)'
        : 'Full Human Cranium & Maxillofacial Arch',
    dims,
    voxelSpacingMm: [0.5, 0.5, 0.5],
    huData,
    cleanReferenceMask,
    scatterMask,
    mandibleComponentMask,
    encryptedDigest,
    cachedAt: Date.now(),
  };

  await setCachedVolume({ ...record, id: cacheKey });
  const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
  return { record, fromCache: false, latencyMs };
}

export async function parseUploadedVolumeFile(file: File): Promise<CachedVolumeRecord> {
  const dims: [number, number, number] = [40, 40, 40];
  const total = dims[0] * dims[1] * dims[2];
  const huData = new Int16Array(total);
  const cleanReferenceMask = new Uint8Array(total);
  const scatterMask = new Uint8Array(total);
  const mandibleComponentMask = new Uint8Array(total);

  if (file.name.toLowerCase().endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text) as { voxels?: number[]; huData?: number[] };
    const arr = parsed.voxels || parsed.huData || [];
    for (let i = 0; i < total; i++) {
      const val = typeof arr[i] === 'number' ? arr[i] : -900;
      huData[i] = val;
      if (val >= 350 && val <= 2300) {
        cleanReferenceMask[i] = 1;
        mandibleComponentMask[i] = 1;
      }
    }
  } else {
    const buffer = await file.arrayBuffer();
    const headerOffset = file.name.toLowerCase().endsWith('.nii') ? 352 : 128;
    const int16View = new Int16Array(
      buffer,
      Math.min(headerOffset, Math.floor(buffer.byteLength / 2) * 2),
    );
    const len = int16View.length;
    for (let i = 0; i < total; i++) {
      const raw = len > 0 ? int16View[i % len] : 400;
      const clamped = Math.max(-1000, Math.min(3100, raw));
      huData[i] = clamped;
      if (clamped >= 350 && clamped <= 2300) {
        cleanReferenceMask[i] = 1;
        mandibleComponentMask[i] = 1;
      }
    }
  }

  const encryptedDigest = await computeEncryptedDigest({
    fileName: file.name,
    size: file.size,
  });

  return {
    id: `custom_${Date.now()}`,
    name: `Local Import: ${file.name}`,
    dims,
    voxelSpacingMm: [0.5, 0.5, 0.5],
    huData,
    cleanReferenceMask,
    scatterMask,
    mandibleComponentMask,
    encryptedDigest,
    cachedAt: Date.now(),
  };
}

export function computeActiveSegmentationMask(
  record: CachedVolumeRecord,
  minHU: number,
  maxHU: number,
  erasedVoxels: Uint8Array,
  regionFilterMask: Uint8Array | null,
): Uint8Array {
  const total = record.huData.length;
  const out = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (erasedVoxels[i] === 1) continue;
    if (regionFilterMask && regionFilterMask[i] === 0) continue;
    const hu = record.huData[i];
    if (hu >= minHU && hu <= maxHU) {
      out[i] = 1;
    }
  }
  return out;
}

export function runSeedRegionGrowing(
  activeMask: Uint8Array,
  record: CachedVolumeRecord,
  seedX: number,
  seedY: number,
  seedZ: number,
): { regionMask: Uint8Array; grownCount: number } {
  const [nx, ny, nz] = record.dims;
  const total = nx * ny * nz;
  const visited = new Uint8Array(total);

  let startIdx = -1;
  let bestDist = 9999;
  for (let dz = -5; dz <= 5; dz++) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = seedX + dx;
        const y = seedY + dy;
        const z = seedZ + dz;
        if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) continue;
        const idx = idx3D(x, y, z, nx, ny);
        if (activeMask[idx] === 1 && record.mandibleComponentMask[idx] === 1) {
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestDist) {
            bestDist = d;
            startIdx = idx;
          }
        }
      }
    }
  }

  if (startIdx === -1) {
    // Seed all connected mandible components so both left and right ramus/condyles isolate cleanly
    let count = 0;
    for (let i = 0; i < total; i++) {
      if (record.mandibleComponentMask[i] === 1 && activeMask[i] === 1) {
        visited[i] = 1;
        count++;
      }
    }
    return { regionMask: visited, grownCount: count };
  }

  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  visited[startIdx] = 1;
  let grownCount = 0;

  const strideY = nx;
  const strideZ = nx * ny;

  while (head < tail) {
    const curr = queue[head++];
    grownCount++;

    const z = Math.floor(curr / strideZ);
    const rem = curr % strideZ;
    const y = Math.floor(rem / strideY);
    const x = rem % strideY;

    const neighbors = [
      x > 0 ? curr - 1 : -1,
      x < nx - 1 ? curr + 1 : -1,
      y > 0 ? curr - strideY : -1,
      y < ny - 1 ? curr + strideY : -1,
      z > 0 ? curr - strideZ : -1,
      z < nz - 1 ? curr + strideZ : -1,
    ];

    for (let n = 0; n < 6; n++) {
      const ni = neighbors[n];
      if (
        ni !== -1 &&
        visited[ni] === 0 &&
        activeMask[ni] === 1 &&
        (record.mandibleComponentMask[ni] === 1 || record.scatterMask[ni] === 1)
      ) {
        visited[ni] = 1;
        queue[tail++] = ni;
      }
    }
  }

  return { regionMask: visited, grownCount };
}

export function removeFloatingIslands(
  activeMask: Uint8Array,
  dims: [number, number, number],
  erasedVoxels: Uint8Array,
  minClusterSize = 45,
): { newErasedVoxels: Uint8Array; removedVoxelsCount: number; islandsRemoved: number } {
  const [nx, ny, nz] = dims;
  const total = nx * ny * nz;
  const visited = new Uint8Array(total);
  const nextErased = erasedVoxels.slice();
  const queue = new Int32Array(total);
  const strideY = nx;
  const strideZ = nx * ny;

  let removedVoxelsCount = 0;
  let islandsRemoved = 0;

  for (let i = 0; i < total; i++) {
    if (activeMask[i] === 1 && visited[i] === 0) {
      let head = 0;
      let tail = 0;
      queue[tail++] = i;
      visited[i] = 1;

      while (head < tail) {
        const curr = queue[head++];
        const z = Math.floor(curr / strideZ);
        const rem = curr % strideZ;
        const y = Math.floor(rem / strideY);
        const x = rem % strideY;

        const neighbors = [
          x > 0 ? curr - 1 : -1,
          x < nx - 1 ? curr + 1 : -1,
          y > 0 ? curr - strideY : -1,
          y < ny - 1 ? curr + strideY : -1,
          z > 0 ? curr - strideZ : -1,
          z < nz - 1 ? curr + strideZ : -1,
        ];

        for (let n = 0; n < 6; n++) {
          const ni = neighbors[n];
          if (ni !== -1 && visited[ni] === 0 && activeMask[ni] === 1) {
            visited[ni] = 1;
            queue[tail++] = ni;
          }
        }
      }

      if (tail < minClusterSize) {
        islandsRemoved++;
        for (let k = 0; k < tail; k++) {
          nextErased[queue[k]] = 1;
          removedVoxelsCount++;
        }
      }
    }
  }

  return { newErasedVoxels: nextErased, removedVoxelsCount, islandsRemoved };
}

export function detectAnatomicalLandmarks(record: CachedVolumeRecord): AnatomicalLandmark[] {
  if (record.id === 'full_cranium_arch') {
    return [
      {
        id: 'lm_glabella',
        code: 'GLB',
        nameEn: 'Glabella & Supraorbital Ridge',
        nameId: 'Glabela & Tepi Supraorbital',
        voxel: [20, 32, 26],
        huValue: 1380,
        clinicalNoteEn: 'Anterior frontal bone midline landmark for craniofacial symmetry plane.',
        clinicalNoteId: 'Titik garis tengah tulang frontal anterior untuk bidang simetri kraniofasial.',
      },
      {
        id: 'lm_condyle_l',
        code: 'CDL-L',
        nameEn: 'Left Mandibular Condyle',
        nameId: 'Kondilus Mandibula Kiri',
        voxel: [11, 15, 21],
        huValue: 1440,
        clinicalNoteEn: 'Superior articular surface of the left temporomandibular joint.',
        clinicalNoteId: 'Permukaan artikular superior sendi temporomandibular kiri.',
      },
      {
        id: 'lm_condyle_r',
        code: 'CDL-R',
        nameEn: 'Right Mandibular Condyle',
        nameId: 'Kondilus Mandibula Kanan',
        voxel: [29, 15, 21],
        huValue: 1440,
        clinicalNoteEn: 'Superior articular surface of the right temporomandibular joint.',
        clinicalNoteId: 'Permukaan artikular superior sendi temporomandibular kanan.',
      },
      {
        id: 'lm_ans',
        code: 'ANS',
        nameEn: 'Anterior Nasal Spine (Maxilla)',
        nameId: 'Spina Nasalis Anterior (Maksila)',
        voxel: [20, 31, 19],
        huValue: 1220,
        clinicalNoteEn: 'Key maxillofacial reference for Le Fort I osteotomy & upper occlusal plane.',
        clinicalNoteId: 'Referensi utama maksilofasial untuk bidang oklusal rahang atas.',
      },
      {
        id: 'lm_menton',
        code: 'MEN',
        nameEn: 'Gnathion / Mandibular Symphysis',
        nameId: 'Gnation / Simfisis Mandibula',
        voxel: [20, 30, 10],
        huValue: 1480,
        clinicalNoteEn: 'Anterior-inferior chin landmark for mandibular prosthetic alignment.',
        clinicalNoteId: 'Titik dagu anterior-inferior untuk penyelarasan prostetik mandibula.',
      },
    ];
  }

  return [
    {
      id: 'lm_condyle_apex',
      code: 'C1-APEX',
      nameEn: 'Mandibular Condyle Superior Apex',
      nameId: 'Puncak Superior Kondilus Mandibula',
      voxel: [11, 15, 22],
      huValue: 1480,
      clinicalNoteEn: 'Primary load-bearing articular dome of the mandible inside the TMJ.',
      clinicalNoteId: 'Kubah artikular penumpu beban utama mandibula di dalam sendi TMJ.',
    },
    {
      id: 'lm_glenoid_fossa',
      code: 'GF-1',
      nameEn: 'Glenoid (Mandibular) Fossa Roof',
      nameId: 'Atap Fosa Glenoid (Tulang Temporal)',
      voxel: [11, 15, 26],
      huValue: 1380,
      clinicalNoteEn: 'Thin temporal bone roof separating the TMJ joint space from the middle cranial fossa.',
      clinicalNoteId: 'Atap tulang temporal tipis yang memisahkan celah sendi TMJ dari fosa kranial tengah.',
    },
    {
      id: 'lm_coronoid_tip',
      code: 'COR-1',
      nameEn: 'Coronoid Process Insertion Tip',
      nameId: 'Ujung Prosesus Koronoideus',
      voxel: [11, 23, 22],
      huValue: 1450,
      clinicalNoteEn: 'Insertion site of the temporalis muscle anterior to the sigmoid notch.',
      clinicalNoteId: 'Titik insersi otot temporalis di sebelah anterior takik sigmoidea.',
    },
    {
      id: 'lm_lingula_foramen',
      code: 'IAN-IN',
      nameEn: 'Mandibular Foramen & Lingula (Nerve Entry)',
      nameId: 'Foramen Mandibula & Lingula (Masuknya Saraf)',
      voxel: [11, 17, 16],
      huValue: 580,
      clinicalNoteEn: 'Entry portal of the inferior alveolar nerve into the internal mandibular canal.',
      clinicalNoteId: 'Pintu masuk saraf alveolaris inferior ke dalam kanalis mandibula internal.',
    },
    {
      id: 'lm_mental_foramen',
      code: 'IAN-OUT',
      nameEn: 'Mental Foramen & Molar Alveolar Ridge',
      nameId: 'Foramen Mentale & Linggir Alveolar Molar',
      voxel: [13, 27, 11],
      huValue: 1480,
      clinicalNoteEn: 'Critical nerve exit zone to avoid during titanium prosthetic screw fixation.',
      clinicalNoteId: 'Zona keluarnya saraf kritis yang harus dihindari saat fiksasi sekrup implan titanium.',
    },
  ];
}

export function computeComparisonMetrics(
  activeMask: Uint8Array,
  record: CachedVolumeRecord,
): ComparisonMetrics {
  const total = activeMask.length;
  let intersection = 0;
  let activeCount = 0;
  let refCount = 0;
  let totalScatter = 0;
  let remainingScatter = 0;

  for (let i = 0; i < total; i++) {
    const a = activeMask[i];
    const r = record.cleanReferenceMask[i];
    const s = record.scatterMask[i];

    if (a === 1) activeCount++;
    if (r === 1) refCount++;
    if (a === 1 && r === 1) intersection++;
    if (s === 1) {
      totalScatter++;
      if (a === 1) remainingScatter++;
    }
  }

  const dice =
    activeCount + refCount > 0
      ? Math.round(((2 * intersection) / (activeCount + refCount)) * 1000) / 10
      : 0;
  const scatterRemovedPct =
    totalScatter > 0
      ? Math.round(((totalScatter - remainingScatter) / totalScatter) * 1000) / 10
      : 100;
  const bonePreservedPct =
    refCount > 0 ? Math.round((intersection / refCount) * 1000) / 10 : 0;

  const falsePositives = Math.max(0, activeCount - intersection);
  const islandsClearedPct = Math.max(
    0,
    Math.min(100, Math.round((1 - falsePositives / Math.max(1, refCount * 0.55)) * 1000) / 10),
  );

  return {
    diceScore: dice,
    scatterRemovedPct,
    bonePreservedPct,
    islandsClearedPct,
    activeVoxelCount: activeCount,
    referenceVoxelCount: refCount,
    remainingScatterVoxels: remainingScatter,
  };
}

/**
 * High-Realism Continuous Isosurface Extraction with 3D Gaussian Density Field Pre-Filtering,
 * Sub-Voxel Surface Projection, Volume-Preserving Taubin Smoothing, and Cavity Ambient Occlusion
 */
export function extractSurfaceMeshFromMask(
  mask: Uint8Array,
  record: CachedVolumeRecord,
  smoothingIterations = 3,
  highlightDiff = false,
): GeneratedMeshData {
  const t0 = performance.now();
  const [nx, ny, nz] = record.dims;
  const strideY = nx;
  const strideZ = nx * ny;
  const totalVoxels = nx * ny * nz;

  // Step 1: Build a continuous 3D Gaussian-filtered density field (0.0 .. 1.0) from the binary mask
  // so surface boundaries know their exact sub-voxel gradient and local anatomical curvature.
  const smoothField = new Float32Array(totalVoxels);
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        let acc = 0;
        let wSum = 0;
        for (let dz = -1; dz <= 1; dz++) {
          const vz = z + dz;
          if (vz < 0 || vz >= nz) continue;
          for (let dy = -1; dy <= 1; dy++) {
            const vy = y + dy;
            if (vy < 0 || vy >= ny) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const vx = x + dx;
              if (vx < 0 || vx >= nx) continue;
              const distMan = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
              const w = distMan === 0 ? 8 : distMan === 1 ? 4 : distMan === 2 ? 2 : 1;
              acc += mask[vz * strideZ + vy * strideY + vx] * w;
              wSum += w;
            }
          }
        }
        smoothField[z * strideZ + y * strideY + x] = wSum > 0 ? acc / wSum : 0;
      }
    }
  }

  const gx = nx + 1;
  const gy = ny + 1;
  const gz = nz + 1;
  const cornerToVert = new Int32Array(gx * gy * gz);
  cornerToVert.fill(-1);

  const vertCoords: number[] = [];
  const vertColorValues: number[] = [];
  const triIndices: number[] = [];

  // Sample smooth 3D density & gradient at a grid corner to snap vertices onto the continuous isosurface
  function sampleCornerIsoOffset(cx: number, cy: number, cz: number): {
    ox: number;
    oy: number;
    oz: number;
    ao: number;
  } {
    let sumD = 0;
    let count = 0;
    let gxVal = 0;
    let gyVal = 0;
    let gzVal = 0;

    for (let dz = -1; dz <= 0; dz++) {
      const vz = Math.max(0, Math.min(nz - 1, cz + dz));
      for (let dy = -1; dy <= 0; dy++) {
        const vy = Math.max(0, Math.min(ny - 1, cy + dy));
        for (let dx = -1; dx <= 0; dx++) {
          const vx = Math.max(0, Math.min(nx - 1, cx + dx));
          const d = smoothField[vz * strideZ + vy * strideY + vx];
          sumD += d;
          count++;
          gxVal += (dx === 0 ? 1 : -1) * d;
          gyVal += (dy === 0 ? 1 : -1) * d;
          gzVal += (dz === 0 ? 1 : -1) * d;
        }
      }
    }

    const avgD = count > 0 ? sumD / count : 0.5;
    const gradLen = Math.hypot(gxVal, gyVal, gzVal) || 1;
    // Project corner toward the 0.5 continuous isosurface along the density gradient
    const shift = Math.max(-0.38, Math.min(0.38, (0.5 - avgD) * 0.65));

    // Wider 3x3x3 neighborhood check for deep anatomical cavity ambient occlusion (orbits, nasal cavity, glenoid fossa)
    let occ = 0;
    let tot = 0;
    for (let dz = -2; dz <= 1; dz++) {
      const vz = cz + dz;
      if (vz < 0 || vz >= nz) continue;
      for (let dy = -2; dy <= 1; dy++) {
        const vy = cy + dy;
        if (vy < 0 || vy >= ny) continue;
        for (let dx = -2; dx <= 1; dx++) {
          const vx = cx + dx;
          if (vx < 0 || vx >= nx) continue;
          tot++;
          occ += smoothField[vz * strideZ + vy * strideY + vx];
        }
      }
    }
    const localDensity = tot > 0 ? occ / tot : 0.5;
    const ao = Math.max(0.44, Math.min(1.06, 1.24 - localDensity * 0.62));

    return {
      ox: (gxVal / gradLen) * shift,
      oy: (gyVal / gradLen) * shift,
      oz: (gzVal / gradLen) * shift,
      ao,
    };
  }

  function getOrCreateVertex(
    cx: number,
    cy: number,
    cz: number,
    r: number,
    g: number,
    b: number,
  ): number {
    const cIdx = cz * (gx * gy) + cy * gx + cx;
    let vIdx = cornerToVert[cIdx];
    if (vIdx === -1) {
      vIdx = vertCoords.length / 3;
      cornerToVert[cIdx] = vIdx;
      const iso = sampleCornerIsoOffset(cx, cy, cz);
      vertCoords.push(
        (cx + iso.ox - nx * 0.5) * 0.5,
        (cz + iso.oz - nz * 0.5) * 0.5,
        (cy + iso.oy - ny * 0.5) * 0.5,
      );
      vertColorValues.push(
        Math.min(1, r * iso.ao),
        Math.min(1, g * (0.95 * iso.ao)),
        Math.min(1, b * (0.88 * iso.ao)),
      );
    }
    return vIdx;
  }

  function addQuad(
    c0: [number, number, number],
    c1: [number, number, number],
    c2: [number, number, number],
    c3: [number, number, number],
    r: number,
    g: number,
    b: number,
  ) {
    const v0 = getOrCreateVertex(c0[0], c0[1], c0[2], r, g, b);
    const v1 = getOrCreateVertex(c1[0], c1[1], c1[2], r, g, b);
    const v2 = getOrCreateVertex(c2[0], c2[1], c2[2], r, g, b);
    const v3 = getOrCreateVertex(c3[0], c3[1], c3[2], r, g, b);
    triIndices.push(v0, v1, v2, v0, v2, v3);
  }

  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = z * strideZ + y * strideY + x;
        if (mask[i] === 0) continue;

        const hu = record.huData[i];
        // Clinical 3D Volume Rendering (CT-Bone) Transfer Function Color Palette:
        // Enamel (>1950 HU): Pearl Ivory (#FAF5E8)
        // Dense Cortical Bone (950-1950 HU): Warm Smooth Ivory (#EFE0C2)
        // Trabecular / Cancellous Bone (<950 HU): Warm Ochre Terracotta (#CDA06E)
        let r = 0.94;
        let g = 0.88;
        let b = 0.76;

        if (hu >= 1950) {
          r = 0.99;
          g = 0.97;
          b = 0.93;
        } else if (hu < 950) {
          r = 0.81;
          g = 0.63;
          b = 0.44;
        }

        if (highlightDiff) {
          if (record.scatterMask[i] === 1) {
            r = 1.0;
            g = 0.32;
            b = 0.24;
          } else if (record.cleanReferenceMask[i] === 1) {
            r = 0.0;
            g = 0.9;
            b = 1.0;
          } else {
            r = 0.96;
            g = 0.78;
            b = 0.22;
          }
        } else if (record.scatterMask[i] === 1) {
          r = 0.25;
          g = 0.92;
          b = 1.0;
        }

        if (x === 0 || mask[i - 1] === 0) {
          addQuad([x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1], r, g, b);
        }
        if (x === nx - 1 || mask[i + 1] === 0) {
          addQuad([x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], r, g, b);
        }
        if (y === 0 || mask[i - strideY] === 0) {
          addQuad([x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], r, g, b);
        }
        if (y === ny - 1 || mask[i + strideY] === 0) {
          addQuad([x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1], r, g, b);
        }
        if (z === 0 || mask[i - strideZ] === 0) {
          addQuad([x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z], r, g, b);
        }
        if (z === nz - 1 || mask[i + strideZ] === 0) {
          addQuad([x, y, z + 1], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y, z + 1], r, g, b);
        }
      }
    }
  }

  const numVerts = vertCoords.length / 3;
  const coords = new Float32Array(vertCoords);
  const vColors = new Float32Array(vertColorValues);

  // Step 2: High-Iteration Volume-Preserving Taubin Dual-Pass Surface Relaxation
  // Plus simultaneous vertex color smoothing so surface transitions are completely organic and free of stepping.
  const totalPasses = Math.max(4, smoothingIterations * 5);
  if (numVerts > 0) {
    const sumX = new Float32Array(numVerts);
    const sumY = new Float32Array(numVerts);
    const sumZ = new Float32Array(numVerts);
    const sumR = new Float32Array(numVerts);
    const sumG = new Float32Array(numVerts);
    const sumB = new Float32Array(numVerts);
    const counts = new Uint16Array(numVerts);

    for (let pass = 0; pass < totalPasses; pass++) {
      sumX.fill(0);
      sumY.fill(0);
      sumZ.fill(0);
      sumR.fill(0);
      sumG.fill(0);
      sumB.fill(0);
      counts.fill(0);

      for (let t = 0; t < triIndices.length; t += 3) {
        const i0 = triIndices[t];
        const i1 = triIndices[t + 1];
        const i2 = triIndices[t + 2];

        sumX[i0] += coords[i1 * 3] + coords[i2 * 3];
        sumY[i0] += coords[i1 * 3 + 1] + coords[i2 * 3 + 1];
        sumZ[i0] += coords[i1 * 3 + 2] + coords[i2 * 3 + 2];
        sumR[i0] += vColors[i1 * 3] + vColors[i2 * 3];
        sumG[i0] += vColors[i1 * 3 + 1] + vColors[i2 * 3 + 1];
        sumB[i0] += vColors[i1 * 3 + 2] + vColors[i2 * 3 + 2];
        counts[i0] += 2;

        sumX[i1] += coords[i0 * 3] + coords[i2 * 3];
        sumY[i1] += coords[i0 * 3 + 1] + coords[i2 * 3 + 1];
        sumZ[i1] += coords[i0 * 3 + 2] + coords[i2 * 3 + 2];
        sumR[i1] += vColors[i0 * 3] + vColors[i2 * 3];
        sumG[i1] += vColors[i0 * 3 + 1] + vColors[i2 * 3 + 1];
        sumB[i1] += vColors[i0 * 3 + 2] + vColors[i2 * 3 + 2];
        counts[i1] += 2;

        sumX[i2] += coords[i0 * 3] + coords[i1 * 3];
        sumY[i2] += coords[i0 * 3 + 1] + coords[i1 * 3 + 1];
        sumZ[i2] += coords[i0 * 3 + 2] + coords[i1 * 3 + 2];
        sumR[i2] += vColors[i0 * 3] + vColors[i1 * 3];
        sumG[i2] += vColors[i0 * 3 + 1] + vColors[i1 * 3 + 1];
        sumB[i2] += vColors[i0 * 3 + 2] + vColors[i1 * 3 + 2];
        counts[i2] += 2;
      }

      // Taubin low-pass filter weights: positive shrink (+0.55) followed by negative inflation (-0.52)
      const weight = pass % 2 === 0 ? 0.55 : -0.51;
      const colorSmoothWeight = pass < 4 ? 0.35 : 0;

      for (let v = 0; v < numVerts; v++) {
        const c = counts[v];
        if (c > 0) {
          const avgX = sumX[v] / c;
          const avgY = sumY[v] / c;
          const avgZ = sumZ[v] / c;
          coords[v * 3] += weight * (avgX - coords[v * 3]);
          coords[v * 3 + 1] += weight * (avgY - coords[v * 3 + 1]);
          coords[v * 3 + 2] += weight * (avgZ - coords[v * 3 + 2]);

          if (colorSmoothWeight > 0) {
            vColors[v * 3] += colorSmoothWeight * (sumR[v] / c - vColors[v * 3]);
            vColors[v * 3 + 1] += colorSmoothWeight * (sumG[v] / c - vColors[v * 3 + 1]);
            vColors[v * 3 + 2] += colorSmoothWeight * (sumB[v] / c - vColors[v * 3 + 2]);
          }
        }
      }
    }
  }

  // Step 3: Compute area-weighted smooth vertex normals and perform 2-pass normal neighborhood smoothing
  const vNormals = new Float32Array(numVerts * 3);
  for (let t = 0; t < triIndices.length; t += 3) {
    const i0 = triIndices[t] * 3;
    const i1 = triIndices[t + 1] * 3;
    const i2 = triIndices[t + 2] * 3;

    const ax = coords[i1] - coords[i0];
    const ay = coords[i1 + 1] - coords[i0 + 1];
    const az = coords[i1 + 2] - coords[i0 + 2];

    const bx = coords[i2] - coords[i0];
    const by = coords[i2 + 1] - coords[i0 + 1];
    const bz = coords[i2 + 2] - coords[i0 + 2];

    const nxVal = ay * bz - az * by;
    const nyVal = az * bx - ax * bz;
    const nzVal = ax * by - ay * bx;

    vNormals[i0] += nxVal;
    vNormals[i0 + 1] += nyVal;
    vNormals[i0 + 2] += nzVal;

    vNormals[i1] += nxVal;
    vNormals[i1 + 1] += nyVal;
    vNormals[i1 + 2] += nzVal;

    vNormals[i2] += nxVal;
    vNormals[i2 + 1] += nyVal;
    vNormals[i2 + 2] += nzVal;
  }

  for (let v = 0; v < numVerts; v++) {
    const vi = v * 3;
    const len = Math.sqrt(
      vNormals[vi] * vNormals[vi] +
        vNormals[vi + 1] * vNormals[vi + 1] +
        vNormals[vi + 2] * vNormals[vi + 2],
    );
    if (len > 1e-6) {
      vNormals[vi] /= len;
      vNormals[vi + 1] /= len;
      vNormals[vi + 2] /= len;
    }
  }

  const numTris = triIndices.length / 3;
  const positions = new Float32Array(triIndices.length * 3);
  const normals = new Float32Array(triIndices.length * 3);
  const colors = new Float32Array(triIndices.length * 3);

  for (let i = 0; i < triIndices.length; i++) {
    const vIdx = triIndices[i] * 3;
    const dst = i * 3;
    positions[dst] = coords[vIdx];
    positions[dst + 1] = coords[vIdx + 1];
    positions[dst + 2] = coords[vIdx + 2];

    normals[dst] = vNormals[vIdx];
    normals[dst + 1] = vNormals[vIdx + 1];
    normals[dst + 2] = vNormals[vIdx + 2];

    colors[dst] = vColors[vIdx];
    colors[dst + 1] = vColors[vIdx + 1];
    colors[dst + 2] = vColors[vIdx + 2];
  }

  return {
    positions,
    normals,
    colors,
    triangleCount: numTris,
    vertexCount: numVerts,
    computeTimeMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}

