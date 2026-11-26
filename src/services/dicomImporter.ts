import dicomParser from 'dicom-parser';
import JSZip from 'jszip';
import { computeEncryptedDigest } from '../firebase';
import { CachedVolumeRecord, DicomMetadata } from './indexedDbCache';

export interface ParsedDicomSlice {
  fileName: string;
  seriesUid: string;
  seriesDescription: string;
  studyDescription: string;
  modality: string;
  rows: number;
  cols: number;
  sliceLocation: number;
  instanceNumber: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
  windowWidth: number;
  windowLevel: number;
  huPixels: Int16Array;
}

export interface DicomImportProgress {
  stage: 'reading' | 'parsing' | 'resampling' | 'complete';
  percent: number;
  messageEn: string;
  messageId: string;
}

export interface DicomImportResult {
  record: CachedVolumeRecord;
  meta: DicomMetadata;
  seriesCountFound: number;
  skippedFiles: number;
}

function parseNumberList(str: string | undefined, fallback: number[]): number[] {
  if (!str) return fallback;
  const parts = str
    .split('\\')
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
  return parts.length > 0 ? parts : fallback;
}

function getSafeString(dataSet: dicomParser.DataSet, tag: string, fallback = ''): string {
  try {
    const val = dataSet.string(tag);
    return val ? val.trim() : fallback;
  } catch {
    return fallback;
  }
}

function getSafeNumber(dataSet: dicomParser.DataSet, tag: string, fallback: number): number {
  try {
    const str = dataSet.string(tag);
    if (str !== undefined) {
      const parsed = parseFloat(str.split('\\')[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
    const u16 = dataSet.uint16(tag);
    if (u16 !== undefined && Number.isFinite(u16)) return u16;
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Parses a single DICOM binary buffer (single-slice or multi-frame Enhanced CT DICOM)
 * into one or more ParsedDicomSlice objects calibrated to Hounsfield Units (HU).
 */
function parseSingleDicomBuffer(buffer: ArrayBuffer, fileName: string): ParsedDicomSlice[] {
  const byteArray = new Uint8Array(buffer);
  if (byteArray.length < 132) {
    throw new Error('File too small to be a valid DICOM file.');
  }

  let dataSet: dicomParser.DataSet;
  try {
    dataSet = dicomParser.parseDicom(byteArray);
  } catch {
    // Some raw DICOM files omit the 128-byte preamble + DICM prefix; try explicit/implicit fallback
    dataSet = dicomParser.parseDicom(byteArray, { untilTag: 'x7fe00010' });
  }

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error(`No PixelData (7FE0,0010) tag found in ${fileName}.`);
  }

  const transferSyntax = getSafeString(dataSet, 'x00020010', '1.2.840.10008.1.2.1');
  const isCompressed =
    pixelDataElement.encapsulatedPixelData ||
    (transferSyntax !== '1.2.840.10008.1.2' &&
      transferSyntax !== '1.2.840.10008.1.2.1' &&
      transferSyntax !== '1.2.840.10008.1.2.2' &&
      transferSyntax !== '');

  if (isCompressed) {
    throw new Error(
      `Compressed DICOM transfer syntax (${transferSyntax}) detected in ${fileName}. Please export uncompressed Little Endian DICOM (.dcm) from your PACS or 3D Slicer.`,
    );
  }

  const isBigEndian = transferSyntax === '1.2.840.10008.1.2.2';
  const rows = dataSet.uint16('x00280010') || 0;
  const cols = dataSet.uint16('x00280011') || 0;
  if (rows <= 0 || cols <= 0 || rows > 4096 || cols > 4096) {
    throw new Error(`Invalid DICOM dimensions (${cols}x${rows}) in ${fileName}.`);
  }

  const bitsAllocated = dataSet.uint16('x00280100') || 16;
  const bitsStored = dataSet.uint16('x00280101') || bitsAllocated;
  const pixelRepresentation = dataSet.uint16('x00280103') || 0; // 0 = unsigned, 1 = signed
  const samplesPerPixel = dataSet.uint16('x00280002') || 1;
  const numberOfFrames = Math.max(1, Math.round(getSafeNumber(dataSet, 'x00280008', 1)));

  const rescaleSlope = getSafeNumber(dataSet, 'x00281053', 1);
  const rescaleIntercept = getSafeNumber(dataSet, 'x00281052', 0);
  const windowCenter = getSafeNumber(dataSet, 'x00281050', 400);
  const windowWidth = Math.max(100, getSafeNumber(dataSet, 'x00281051', 2000));

  const modality = getSafeString(dataSet, 'x00080060', 'CT');
  const seriesUid = getSafeString(dataSet, 'x0020000e', 'DEFAULT_SERIES');
  const seriesDescription = getSafeString(dataSet, 'x0008103e', 'Imported DICOM CT Series');
  const studyDescription = getSafeString(dataSet, 'x00081030', 'Craniofacial CT Study');

  const pixelSpacingVals = parseNumberList(getSafeString(dataSet, 'x00280030'), [0.5, 0.5]);
  const pixelSpacing: [number, number] = [
    pixelSpacingVals[0] || 0.5,
    pixelSpacingVals[1] || pixelSpacingVals[0] || 0.5,
  ];
  const sliceThickness = Math.max(0.1, getSafeNumber(dataSet, 'x00180050', 0.5));

  const ipp = parseNumberList(getSafeString(dataSet, 'x00200032'), []);
  const baseSliceLoc =
    ipp.length >= 3
      ? ipp[2]
      : getSafeNumber(dataSet, 'x00201041', getSafeNumber(dataSet, 'x00200013', 0));
  const instanceNumber = Math.round(getSafeNumber(dataSet, 'x00200013', 0));

  const bytesPerSample = bitsAllocated === 8 ? 1 : 2;
  const pixelsPerFrame = rows * cols;
  const frameByteLen = pixelsPerFrame * samplesPerPixel * bytesPerSample;
  const dataView = new DataView(
    byteArray.buffer,
    byteArray.byteOffset + pixelDataElement.dataOffset,
    Math.min(pixelDataElement.length, byteArray.byteLength - pixelDataElement.dataOffset),
  );

  const slices: ParsedDicomSlice[] = [];
  const signBitMask = 1 << (bitsStored - 1);
  const valueMask = (1 << bitsStored) - 1;

  for (let frameIdx = 0; frameIdx < numberOfFrames; frameIdx++) {
    const frameStart = frameIdx * frameByteLen;
    if (frameStart + frameByteLen > dataView.byteLength) break;

    const huPixels = new Int16Array(pixelsPerFrame);
    for (let p = 0; p < pixelsPerFrame; p++) {
      const byteOff = frameStart + p * samplesPerPixel * bytesPerSample;
      let raw = 0;
      if (bytesPerSample === 1) {
        raw = pixelRepresentation === 1 ? dataView.getInt8(byteOff) : dataView.getUint8(byteOff);
      } else {
        raw = isBigEndian
          ? pixelRepresentation === 1
            ? dataView.getInt16(byteOff, false)
            : dataView.getUint16(byteOff, false)
          : pixelRepresentation === 1
            ? dataView.getInt16(byteOff, true)
            : dataView.getUint16(byteOff, true);

        // Mask unused high bits if bitsStored < 16
        if (bitsStored < 16) {
          raw = raw & valueMask;
          if (pixelRepresentation === 1 && (raw & signBitMask) !== 0) {
            raw = raw - (1 << bitsStored);
          }
        }
      }

      const hu = Math.round(raw * rescaleSlope + rescaleIntercept);
      huPixels[p] = Math.max(-1024, Math.min(4000, hu));
    }

    slices.push({
      fileName: numberOfFrames > 1 ? `${fileName}#${frameIdx + 1}` : fileName,
      seriesUid,
      seriesDescription,
      studyDescription,
      modality,
      rows,
      cols,
      sliceLocation: baseSliceLoc + frameIdx * sliceThickness,
      instanceNumber: instanceNumber + frameIdx,
      pixelSpacing,
      sliceThickness,
      windowWidth,
      windowLevel: windowCenter,
      huPixels,
    });
  }

  return slices;
}

/**
 * Unpacks a list of File objects (including .dcm, extensionless PACS DICOM files, .zip archives, .nii, or .json)
 * and constructs a resampled, calibrated CachedVolumeRecord ready for the 4-Viewport Workstation.
 */
export async function importDicomOrVolumeFiles(
  fileList: File[],
  targetGridSize: 48 | 64 = 64,
  onProgress?: (progress: DicomImportProgress) => void,
): Promise<DicomImportResult> {
  if (!fileList || fileList.length === 0) {
    throw new Error('No files selected.');
  }

  onProgress?.({
    stage: 'reading',
    percent: 8,
    messageEn: `Scanning ${fileList.length} selected file(s)...`,
    messageId: `Memindai ${fileList.length} file yang dipilih...`,
  });

  // 1. Expand any .zip archives into raw binary entries
  const candidateBuffers: Array<{ name: string; buffer: ArrayBuffer }> = [];
  let skippedFiles = 0;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const lower = file.name.toLowerCase();

    // Skip obvious non-imaging OS junk files
    if (
      lower.endsWith('.ds_store') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.xml') ||
      lower.endsWith('.html') ||
      lower.endsWith('.pdf') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.png') ||
      lower.startsWith('dicomdir')
    ) {
      skippedFiles++;
      continue;
    }

    if (lower.endsWith('.zip')) {
      onProgress?.({
        stage: 'reading',
        percent: 15,
        messageEn: `Extracting DICOM archive: ${file.name}...`,
        messageId: `Mengekstrak arsip DICOM: ${file.name}...`,
      });
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries = Object.values(zip.files).filter((entry) => !entry.dir);
      for (const entry of entries) {
        const entryLower = entry.name.toLowerCase();
        if (
          entryLower.includes('__macosx') ||
          entryLower.endsWith('.ds_store') ||
          entryLower.endsWith('.txt') ||
          entryLower.endsWith('.xml') ||
          entryLower.endsWith('dicomdir')
        ) {
          skippedFiles++;
          continue;
        }
        const buf = await entry.async('arraybuffer');
        candidateBuffers.push({ name: entry.name.split('/').pop() || entry.name, buffer: buf });
      }
    } else {
      const buf = await file.arrayBuffer();
      candidateBuffers.push({ name: file.name, buffer: buf });
    }
  }

  if (candidateBuffers.length === 0) {
    throw new Error('No readable DICOM or volumetric files found.');
  }

  // 2. Check for NIfTI (.nii) or JSON volumetric single-file import
  if (candidateBuffers.length === 1) {
    const single = candidateBuffers[0];
    const lower = single.name.toLowerCase();
    if (lower.endsWith('.json') || lower.endsWith('.nii')) {
      const record = await parseNiftiOrJsonBuffer(single.buffer, single.name, targetGridSize);
      const meta: DicomMetadata = record.dicomMeta || {
        modality: lower.endsWith('.nii') ? 'NIfTI-CT' : 'JSON-VOL',
        seriesDescription: single.name,
        studyDescription: 'Imported Volumetric Dataset',
        originalMatrix: `${record.dims[0]}x${record.dims[1]}x${record.dims[2]}`,
        sliceCount: record.dims[2],
        pixelSpacingMm: [record.voxelSpacingMm[0], record.voxelSpacingMm[1]],
        sliceThicknessMm: record.voxelSpacingMm[2],
        huMin: -1000,
        huMax: 3000,
        recommendedWindowWidth: 2000,
        recommendedWindowLevel: 400,
        isCustomDicom: true,
      };
      onProgress?.({
        stage: 'complete',
        percent: 100,
        messageEn: `Loaded ${single.name}`,
        messageId: `Berhasil memuat ${single.name}`,
      });
      return { record, meta, seriesCountFound: 1, skippedFiles };
    }
  }

  // 3. Parse all DICOM files
  const allParsedSlices: ParsedDicomSlice[] = [];
  let lastErrorMsg = '';

  for (let i = 0; i < candidateBuffers.length; i++) {
    const item = candidateBuffers[i];
    if (i % 8 === 0 || i === candidateBuffers.length - 1) {
      const pct = Math.round(20 + (i / Math.max(1, candidateBuffers.length)) * 50);
      onProgress?.({
        stage: 'parsing',
        percent: pct,
        messageEn: `Parsing DICOM slice ${i + 1} / ${candidateBuffers.length}...`,
        messageId: `Membaca irisan DICOM ${i + 1} / ${candidateBuffers.length}...`,
      });
    }
    try {
      const slices = parseSingleDicomBuffer(item.buffer, item.name);
      allParsedSlices.push(...slices);
    } catch (err: unknown) {
      skippedFiles++;
      lastErrorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  if (allParsedSlices.length === 0) {
    throw new Error(
      lastErrorMsg ||
        'Could not decode any DICOM slices. Ensure files are uncompressed standard DICOM (.dcm) CT files.',
    );
  }

  // 4. Group by SeriesInstanceUID & pick the largest volumetric series
  const seriesGroups = new Map<string, ParsedDicomSlice[]>();
  for (const s of allParsedSlices) {
    const arr = seriesGroups.get(s.seriesUid) || [];
    arr.push(s);
    seriesGroups.set(s.seriesUid, arr);
  }

  let primarySeries: ParsedDicomSlice[] = [];
  for (const group of seriesGroups.values()) {
    if (group.length > primarySeries.length) {
      primarySeries = group;
    }
  }

  // Sort slices anatomically by SliceLocation / ImagePositionPatient Z (fallback to InstanceNumber)
  primarySeries.sort((a, b) => {
    if (Math.abs(a.sliceLocation - b.sliceLocation) > 1e-4) {
      return a.sliceLocation - b.sliceLocation;
    }
    return a.instanceNumber - b.instanceNumber;
  });

  onProgress?.({
    stage: 'resampling',
    percent: 78,
    messageEn: `Resampling ${primarySeries.length} CT slice(s) into ${targetGridSize}³ volumetric grid...`,
    messageId: `Menyusun ${primarySeries.length} irisan CT ke grid volumetrik ${targetGridSize}³...`,
  });

  // 5. Resample sorted DICOM stack into isotropic workstation grid [nx, ny, nz]
  const refSlice = primarySeries[0];
  const srcCols = refSlice.cols;
  const srcRows = refSlice.rows;
  const srcSlices = primarySeries.length;

  const nx = targetGridSize;
  const ny = targetGridSize;
  const nz = targetGridSize;
  const totalVoxels = nx * ny * nz;

  const huData = new Int16Array(totalVoxels);
  const cleanReferenceMask = new Uint8Array(totalVoxels);
  const scatterMask = new Uint8Array(totalVoxels);
  const mandibleComponentMask = new Uint8Array(totalVoxels);

  let huMin = 32767;
  let huMax = -32768;

  for (let z = 0; z < nz; z++) {
    // Map z -> source slice index (interpolating between adjacent slices)
    const fz = srcSlices === 1 ? 0 : (z / (nz - 1)) * (srcSlices - 1);
    const z0 = Math.floor(fz);
    const z1 = Math.min(srcSlices - 1, z0 + 1);
    const wz = fz - z0;

    const slice0 = primarySeries[z0];
    const slice1 = primarySeries[z1];

    // If single slice only, keep full clarity in middle slab and gently taper outer air bounds
    const singleSliceAirMask = srcSlices === 1 && (z < nz * 0.35 || z > nz * 0.65);

    for (let y = 0; y < ny; y++) {
      // DICOM row 0 is anterior/top; invert y so y=ny-1 maps to anterior (consistent with MPR viewer)
      const srcY = ((ny - 1 - y) / (ny - 1)) * (srcRows - 1);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(srcRows - 1, y0 + 1);
      const wy = srcY - y0;

      for (let x = 0; x < nx; x++) {
        const idx = z * (nx * ny) + y * nx + x;
        if (singleSliceAirMask) {
          huData[idx] = -1000;
          continue;
        }

        const srcX = (x / (nx - 1)) * (srcCols - 1);
        const x0 = Math.floor(srcX);
        const x1 = Math.min(srcCols - 1, x0 + 1);
        const wx = srcX - x0;

        // Bilinear sample on slice0
        const p00 = slice0.huPixels[y0 * srcCols + x0];
        const p10 = slice0.huPixels[y0 * srcCols + x1];
        const p01 = slice0.huPixels[y1 * srcCols + x0];
        const p11 = slice0.huPixels[y1 * srcCols + x1];
        const val0 =
          (p00 * (1 - wx) + p10 * wx) * (1 - wy) + (p01 * (1 - wx) + p11 * wx) * wy;

        let huVal = val0;
        if (z1 !== z0 && slice1.cols === srcCols && slice1.rows === srcRows) {
          const q00 = slice1.huPixels[y0 * srcCols + x0];
          const q10 = slice1.huPixels[y0 * srcCols + x1];
          const q01 = slice1.huPixels[y1 * srcCols + x0];
          const q11 = slice1.huPixels[y1 * srcCols + x1];
          const val1 =
            (q00 * (1 - wx) + q10 * wx) * (1 - wy) + (q01 * (1 - wx) + q11 * wx) * wy;
          huVal = val0 * (1 - wz) + val1 * wz;
        }

        const roundedHu = Math.round(huVal);
        huData[idx] = roundedHu;
        if (roundedHu < huMin) huMin = roundedHu;
        if (roundedHu > huMax) huMax = roundedHu;

        // Mark cortical bone band as baseline reference and allow full Region Growing on any connected bone
        if (roundedHu >= 300 && roundedHu <= 2600) {
          cleanReferenceMask[idx] = 1;
          mandibleComponentMask[idx] = 1;
        } else if (roundedHu > 2600) {
          // Flag extreme hyperdense metal/dental fillings (>2600 HU) as potential scatter artifacts
          scatterMask[idx] = 1;
          mandibleComponentMask[idx] = 1;
        }
      }
    }
  }

  // Compute physical voxel spacing of the resampled grid
  const fovX = srcCols * refSlice.pixelSpacing[1];
  const fovY = srcRows * refSlice.pixelSpacing[0];
  const zSpan =
    srcSlices > 1
      ? Math.max(
          refSlice.sliceThickness * srcSlices,
          Math.abs(primarySeries[srcSlices - 1].sliceLocation - refSlice.sliceLocation),
        )
      : refSlice.sliceThickness * 16;

  const spacingX = Math.max(0.25, Math.min(2.5, fovX / nx));
  const spacingY = Math.max(0.25, Math.min(2.5, fovY / ny));
  const spacingZ = Math.max(0.25, Math.min(2.5, zSpan / nz));

  const meta: DicomMetadata = {
    modality: refSlice.modality,
    seriesDescription: refSlice.seriesDescription,
    studyDescription: refSlice.studyDescription,
    originalMatrix: `${srcCols} × ${srcRows} × ${srcSlices}`,
    sliceCount: srcSlices,
    pixelSpacingMm: refSlice.pixelSpacing,
    sliceThicknessMm: refSlice.sliceThickness,
    huMin,
    huMax,
    recommendedWindowWidth: refSlice.windowWidth,
    recommendedWindowLevel: refSlice.windowLevel,
    isCustomDicom: true,
  };

  const encryptedDigest = await computeEncryptedDigest({
    seriesDescription: refSlice.seriesDescription,
    originalMatrix: meta.originalMatrix,
    sliceCount: srcSlices,
    ts: Date.now(),
  });

  const record: CachedVolumeRecord = {
    id: `dicom_${Date.now()}`,
    name: `${refSlice.modality} · ${refSlice.seriesDescription} (${srcSlices} slices)`,
    dims: [nx, ny, nz],
    voxelSpacingMm: [
      Math.round(spacingX * 100) / 100,
      Math.round(spacingY * 100) / 100,
      Math.round(spacingZ * 100) / 100,
    ],
    huData,
    cleanReferenceMask,
    scatterMask,
    mandibleComponentMask,
    encryptedDigest,
    cachedAt: Date.now(),
    dicomMeta: meta,
  };

  onProgress?.({
    stage: 'complete',
    percent: 100,
    messageEn: `Imported ${srcSlices} DICOM CT slice(s) (${srcCols}×${srcRows}) calibrated in Hounsfield Units.`,
    messageId: `Berhasil mengimpor ${srcSlices} irisan CT DICOM (${srcCols}×${srcRows}) terkalibrasi Unit Hounsfield.`,
  });

  return {
    record,
    meta,
    seriesCountFound: seriesGroups.size,
    skippedFiles,
  };
}

/**
 * Parses NIfTI-1 (.nii) or JSON volumetric arrays into a resampled CachedVolumeRecord.
 */
async function parseNiftiOrJsonBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  targetGridSize: 48 | 64,
): Promise<CachedVolumeRecord> {
  const lower = fileName.toLowerCase();
  const nx = targetGridSize;
  const ny = targetGridSize;
  const nz = targetGridSize;
  const total = nx * ny * nz;
  const huData = new Int16Array(total);
  const cleanReferenceMask = new Uint8Array(total);
  const scatterMask = new Uint8Array(total);
  const mandibleComponentMask = new Uint8Array(total);

  let origMatrix = `${nx}×${ny}×${nz}`;
  let spacingMm: [number, number, number] = [0.5, 0.5, 0.5];

  if (lower.endsWith('.json')) {
    const text = new TextDecoder().decode(buffer);
    const parsed = JSON.parse(text) as {
      voxels?: number[];
      huData?: number[];
      dims?: [number, number, number];
    };
    const arr = parsed.voxels || parsed.huData || [];
    for (let i = 0; i < total; i++) {
      const val = typeof arr[i] === 'number' ? arr[i] : -950;
      huData[i] = Math.max(-1024, Math.min(3500, Math.round(val)));
      if (huData[i] >= 300 && huData[i] <= 2600) {
        cleanReferenceMask[i] = 1;
        mandibleComponentMask[i] = 1;
      }
    }
  } else {
    // Parse standard NIfTI-1 348-byte header
    const dv = new DataView(buffer);
    const headerSize = dv.getInt32(0, true);
    const littleEndian = headerSize === 348;
    const dimX = Math.max(1, dv.getInt16(42, littleEndian));
    const dimY = Math.max(1, dv.getInt16(44, littleEndian));
    const dimZ = Math.max(1, dv.getInt16(46, littleEndian));
    const datatype = dv.getInt16(70, littleEndian);
    const voxOffset = Math.max(352, Math.round(dv.getFloat32(108, littleEndian) || 352));
    const sclSlope = dv.getFloat32(112, littleEndian) || 1;
    const sclInter = dv.getFloat32(116, littleEndian) || 0;
    const pixX = Math.abs(dv.getFloat32(80, littleEndian)) || 0.5;
    const pixY = Math.abs(dv.getFloat32(84, littleEndian)) || 0.5;
    const pixZ = Math.abs(dv.getFloat32(88, littleEndian)) || 0.5;

    origMatrix = `${dimX} × ${dimY} × ${dimZ}`;
    spacingMm = [
      Math.round(pixX * 100) / 100,
      Math.round(pixY * 100) / 100,
      Math.round(pixZ * 100) / 100,
    ];

    const readVoxel = (vx: number, vy: number, vz: number): number => {
      const flat = vz * (dimX * dimY) + vy * dimX + vx;
      let raw = -1000;
      if (datatype === 4 && voxOffset + flat * 2 + 2 <= buffer.byteLength) {
        raw = dv.getInt16(voxOffset + flat * 2, littleEndian);
      } else if (datatype === 512 && voxOffset + flat * 2 + 2 <= buffer.byteLength) {
        raw = dv.getUint16(voxOffset + flat * 2, littleEndian);
      } else if (datatype === 16 && voxOffset + flat * 4 + 4 <= buffer.byteLength) {
        raw = dv.getFloat32(voxOffset + flat * 4, littleEndian);
      } else if (datatype === 2 && voxOffset + flat + 1 <= buffer.byteLength) {
        raw = dv.getUint8(voxOffset + flat);
      }
      return Math.round(raw * (sclSlope === 0 ? 1 : sclSlope) + sclInter);
    };

    for (let z = 0; z < nz; z++) {
      const sz = Math.min(dimZ - 1, Math.floor((z / Math.max(1, nz - 1)) * (dimZ - 1)));
      for (let y = 0; y < ny; y++) {
        const sy = Math.min(dimY - 1, Math.floor((y / Math.max(1, ny - 1)) * (dimY - 1)));
        for (let x = 0; x < nx; x++) {
          const sx = Math.min(dimX - 1, Math.floor((x / Math.max(1, nx - 1)) * (dimX - 1)));
          const i = z * (nx * ny) + y * nx + x;
          const val = Math.max(-1024, Math.min(3500, readVoxel(sx, sy, sz)));
          huData[i] = val;
          if (val >= 300 && val <= 2600) {
            cleanReferenceMask[i] = 1;
            mandibleComponentMask[i] = 1;
          } else if (val > 2600) {
            scatterMask[i] = 1;
            mandibleComponentMask[i] = 1;
          }
        }
      }
    }
  }

  const encryptedDigest = await computeEncryptedDigest({
    fileName,
    origMatrix,
    ts: Date.now(),
  });

  return {
    id: `vol_${Date.now()}`,
    name: `Imported: ${fileName}`,
    dims: [nx, ny, nz],
    voxelSpacingMm: spacingMm,
    huData,
    cleanReferenceMask,
    scatterMask,
    mandibleComponentMask,
    encryptedDigest,
    cachedAt: Date.now(),
    dicomMeta: {
      modality: lower.endsWith('.nii') ? 'NIfTI-CT' : 'JSON-CT',
      seriesDescription: fileName,
      studyDescription: 'Local Volumetric Import',
      originalMatrix: origMatrix,
      sliceCount: nz,
      pixelSpacingMm: [spacingMm[0], spacingMm[1]],
      sliceThicknessMm: spacingMm[2],
      huMin: -1000,
      huMax: 3000,
      recommendedWindowWidth: 2000,
      recommendedWindowLevel: 400,
      isCustomDicom: true,
    },
  };
}

/**
 * Generates a standards-compliant, multi-frame DICOM Part 10 (.dcm) CT Cranio-TMJ phantom
 * binary file that users can download and immediately test with the DICOM importer or external DICOM viewers.
 */
export function buildSampleDicomPart10Blob(sourceVolume: CachedVolumeRecord): Blob {
  const [cols, rows, frames] = sourceVolume.dims;
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();

  const pushExplicitTag = (group: number, elem: number, vr: string, dataBytes: Uint8Array) => {
    const isLongVr = vr === 'OB' || vr === 'OW' || vr === 'SQ' || vr === 'UN' || vr === 'UT';
    const paddedLen = dataBytes.length % 2 === 1 ? dataBytes.length + 1 : dataBytes.length;
    const headerLen = isLongVr ? 12 : 8;
    const out = new Uint8Array(headerLen + paddedLen);
    const dv = new DataView(out.buffer);
    dv.setUint16(0, group, true);
    dv.setUint16(2, elem, true);
    out[4] = vr.charCodeAt(0);
    out[5] = vr.charCodeAt(1);
    if (isLongVr) {
      dv.setUint16(6, 0, true);
      dv.setUint32(8, paddedLen, true);
      out.set(dataBytes, 12);
    } else {
      dv.setUint16(6, paddedLen, true);
      out.set(dataBytes, 8);
    }
    if (paddedLen > dataBytes.length) {
      out[headerLen + dataBytes.length] = vr === 'UI' ? 0x00 : 0x20;
    }
    chunks.push(out);
  };

  const strTag = (g: number, e: number, vr: string, val: string) =>
    pushExplicitTag(g, e, vr, encoder.encode(val));

  const u16Tag = (g: number, e: number, val: number) => {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, val, true);
    pushExplicitTag(g, e, 'US', b);
  };

  // 128-byte preamble + 'DICM' magic header
  const preamble = new Uint8Array(132);
  preamble[128] = 68; // D
  preamble[129] = 73; // I
  preamble[130] = 67; // C
  preamble[131] = 77; // M
  chunks.push(preamble);

  // File Meta Information (Explicit VR Little Endian: 1.2.840.10008.1.2.1)
  strTag(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1');
  // Core CT DICOM Metadata Tags
  strTag(0x0008, 0x0060, 'CS', 'CT');
  strTag(0x0008, 0x1030, 'LO', 'Karina 3D Lab Synthetic Cranio-TMJ Study');
  strTag(0x0008, 0x103e, 'LO', 'Axial Skull & TMJ 0.5mm Bone Series');
  strTag(0x0010, 0x0010, 'PN', 'ANONYMIZED^PHANTOM');
  strTag(0x0018, 0x0050, 'DS', String(sourceVolume.voxelSpacingMm[2]));
  strTag(0x0020, 0x000e, 'UI', '1.2.826.0.1.3680043.8.498.20261125');
  strTag(0x0020, 0x0013, 'IS', '1');
  strTag(0x0020, 0x1041, 'DS', '0.0');

  u16Tag(0x0028, 0x0002, 1); // SamplesPerPixel
  strTag(0x0028, 0x0004, 'CS', 'MONOCHROME2');
  strTag(0x0028, 0x0008, 'IS', String(frames)); // NumberOfFrames
  u16Tag(0x0028, 0x0010, rows); // Rows
  u16Tag(0x0028, 0x0011, cols); // Columns
  strTag(
    0x0028,
    0x0030,
    'DS',
    `${sourceVolume.voxelSpacingMm[1]}\\${sourceVolume.voxelSpacingMm[0]}`,
  );
  u16Tag(0x0028, 0x0100, 16); // BitsAllocated
  u16Tag(0x0028, 0x0101, 16); // BitsStored
  u16Tag(0x0028, 0x0102, 15); // HighBit
  u16Tag(0x0028, 0x0103, 0); // PixelRepresentation (unsigned with -1024 intercept)
  strTag(0x0028, 0x1050, 'DS', '400'); // WindowCenter
  strTag(0x0028, 0x1051, 'DS', '2000'); // WindowWidth
  strTag(0x0028, 0x1052, 'DS', '-1024'); // RescaleIntercept
  strTag(0x0028, 0x1053, 'DS', '1'); // RescaleSlope

  // PixelData (7FE0,0010) stored as unsigned 16-bit (HU + 1024)
  const pixelBytes = new Uint8Array(cols * rows * frames * 2);
  const pixDv = new DataView(pixelBytes.buffer);
  let writeIdx = 0;
  for (let z = 0; z < frames; z++) {
    for (let y = rows - 1; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const hu = sourceVolume.huData[z * (cols * rows) + y * cols + x];
        const stored = Math.max(0, Math.min(65535, hu + 1024));
        pixDv.setUint16(writeIdx * 2, stored, true);
        writeIdx++;
      }
    }
  }
  pushExplicitTag(0x7fe0, 0x0010, 'OW', pixelBytes);

  return new Blob(chunks as BlobPart[], { type: 'application/dicom' });
}
