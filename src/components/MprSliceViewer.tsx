import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Ruler } from 'lucide-react';
import { CachedVolumeRecord } from '../services/indexedDbCache';
import { AnatomicalLandmark } from '../services/volumeGenerator';
import { Language } from '../i18n/translations';

export type MprPlane = 'axial' | 'coronal' | 'sagittal';
export type WorkstationTool = 'navigate' | 'brush' | 'lasso' | 'region_grow' | 'caliper';

interface MprSliceViewerProps {
  plane: MprPlane;
  language: Language;
  volume: CachedVolumeRecord;
  activeMask: Uint8Array;
  slices: [number, number, number]; // [x, y, z]
  windowWidth: number;
  windowLevel: number;
  activeTool: WorkstationTool;
  brushRadius: number;
  compareMode: boolean;
  calibrationMm: number; // 0.5 to 1.0 mm per voxel
  landmarks: AnatomicalLandmark[];
  onSliceChange: (newSlices: [number, number, number]) => void;
  onEraseVoxels: (voxelIndices: number[]) => void;
  onSeedRegionGrow: (seed: [number, number, number]) => void;
  onRecordMeasurement: (distanceMm: number, planeLabel: string) => void;
}

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const MprSliceViewer: React.FC<MprSliceViewerProps> = ({
  plane,
  language,
  volume,
  activeMask,
  slices,
  windowWidth,
  windowLevel,
  activeTool,
  brushRadius,
  compareMode,
  calibrationMm,
  landmarks,
  onSliceChange,
  onEraseVoxels,
  onSeedRegionGrow,
  onRecordMeasurement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [hoverHu, setHoverHu] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<[number, number, number] | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<[number, number][]>([]);
  const [caliperPts, setCaliperPts] = useState<[number, number][]>([]);
  const [measuredMm, setMeasuredMm] = useState<number | null>(null);

  const [nx, ny, nz] = volume.dims;
  const [sx, sy, sz] = slices;

  const planeMeta = {
    axial: {
      titleEn: 'AXIAL (Z-Plane)',
      titleId: 'AKSIAL (Bidang-Z)',
      seriesName: 'Serie: Ricostruzione Assiale CT',
      axisBadge: 'Z',
      sliceVal: sz,
      maxSlice: nz - 1,
      orientTop: 'A',
      orientBottom: 'P',
      orientLeft: 'R',
      orientRight: 'L',
    },
    coronal: {
      titleEn: 'CORONAL (Y-Plane)',
      titleId: 'KORONAL (Bidang-Y)',
      seriesName: 'Serie: Ricostruzione Coronale',
      axisBadge: 'Y',
      sliceVal: sy,
      maxSlice: ny - 1,
      orientTop: 'S',
      orientBottom: 'I',
      orientLeft: 'R',
      orientRight: 'L',
    },
    sagittal: {
      titleEn: 'SAGITTAL (X-Plane)',
      titleId: 'SAGITAL (Bidang-X)',
      seriesName: 'Serie: Ricostruzione Sagittale',
      axisBadge: 'X',
      sliceVal: sx,
      maxSlice: nx - 1,
      orientTop: 'S',
      orientBottom: 'I',
      orientLeft: 'A',
      orientRight: 'P',
    },
  }[plane];

  const uvToVoxel = (u: number, v: number): [number, number, number] => {
    const cu = Math.max(0, Math.min(39, Math.floor(u)));
    const cv = Math.max(0, Math.min(39, Math.floor(v)));
    if (plane === 'axial') {
      return [cu, 39 - cv, sz];
    }
    if (plane === 'coronal') {
      return [cu, sy, 39 - cv];
    }
    return [sx, 39 - cu, 39 - cv];
  };

  const voxelToUv = (vx: number, vy: number, vz: number): [number, number, boolean] => {
    if (plane === 'axial') {
      return [vx, 39 - vy, Math.abs(vz - sz) <= 1];
    }
    if (plane === 'coronal') {
      return [vx, 39 - vz, Math.abs(vy - sy) <= 1];
    }
    return [39 - vy, 39 - vz, Math.abs(vx - sx) <= 1];
  };

  const idx3D = (x: number, y: number, z: number) => z * (nx * ny) + y * nx + x;

  // High-Resolution Bilinearly Interpolated DICOM Slice Renderer + Crisp Slicer-Style Segmentation Contours
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#02050A';
    ctx.fillRect(0, 0, width, height);

    if (!offscreenCanvasRef.current) {
      const off = document.createElement('canvas');
      off.width = 240;
      off.height = 240;
      offscreenCanvasRef.current = off;
    }
    const offCanvas = offscreenCanvasRef.current;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const bufW = offCanvas.width;
    const bufH = offCanvas.height;
    const imgData = offCtx.createImageData(bufW, bufH);
    const data = imgData.data;

    const minWin = windowLevel - windowWidth * 0.5;
    const maxWin = windowLevel + windowWidth * 0.5;
    const winSpan = Math.max(1, maxWin - minWin);

    const sampleHuAt = (u: number, v: number): number => {
      const [vx, vy, vz] = uvToVoxel(u, v);
      return volume.huData[idx3D(vx, vy, vz)];
    };

    const sampleMaskAt = (u: number, v: number): number => {
      const [vx, vy, vz] = uvToVoxel(u, v);
      return activeMask[idx3D(vx, vy, vz)];
    };

    // Bilinear interpolation across the 40x40 slice grid for smooth medical DICOM appearance
    for (let py = 0; py < bufH; py++) {
      const gv = (py / (bufH - 1)) * 39;
      const v0 = Math.floor(gv);
      const v1 = Math.min(39, v0 + 1);
      const fv = gv - v0;

      for (let px = 0; px < bufW; px++) {
        const gu = (px / (bufW - 1)) * 39;
        const u0 = Math.floor(gu);
        const u1 = Math.min(39, u0 + 1);
        const fu = gu - u0;

        const hu00 = sampleHuAt(u0, v0);
        const hu10 = sampleHuAt(u1, v0);
        const hu01 = sampleHuAt(u0, v1);
        const hu11 = sampleHuAt(u1, v1);

        const huTop = hu00 * (1 - fu) + hu10 * fu;
        const huBot = hu01 * (1 - fu) + hu11 * fu;
        const interpHu = huTop * (1 - fv) + huBot * fv;

        let norm = (interpHu - minWin) / winSpan;
        norm = Math.max(0, Math.min(1, norm));
        const gray = Math.round(norm * 255);

        // Smooth mask field for crisp contour border + translucent interior fill (3D Slicer / iMed style)
        const m00 = sampleMaskAt(u0, v0);
        const m10 = sampleMaskAt(u1, v0);
        const m01 = sampleMaskAt(u0, v1);
        const m11 = sampleMaskAt(u1, v1);
        const interpMask =
          (m00 * (1 - fu) + m10 * fu) * (1 - fv) +
          (m01 * (1 - fu) + m11 * fu) * fv;

        const nearU = Math.round(gu);
        const nearV = Math.round(gv);
        const [nvx, nvy, nvz] = uvToVoxel(nearU, nearV);
        const ni = idx3D(nvx, nvy, nvz);
        const isRef = volume.cleanReferenceMask[ni] === 1;
        const isScatter = volume.scatterMask[ni] === 1;

        let r = gray;
        let g = gray;
        let b = gray;

        if (interpMask >= 0.35) {
          const isContourEdge = interpMask >= 0.35 && interpMask <= 0.72;
          const alpha = isContourEdge ? 0.92 : 0.34;

          let mr = 0;
          let mg = 229;
          let mb = 255;

          if (compareMode) {
            if (isScatter) {
              mr = 255;
              mg = 75;
              mb = 75; // Uncleaned scatter artifact: Coral Red
            } else if (isRef) {
              mr = 16;
              mg = 235;
              mb = 160; // Verified reference match: Emerald-Cyan
            } else {
              mr = 255;
              mg = 215;
              mb = 0; // Unseparated temporal bone: Gold
            }
          } else if (isScatter) {
            mr = 56;
            mg = 235;
            mb = 255;
          }

          r = Math.round(gray * (1 - alpha) + mr * alpha);
          g = Math.round(gray * (1 - alpha) + mg * alpha);
          b = Math.round(gray * (1 - alpha) + mb * alpha);
        } else if (compareMode && isRef) {
          // Reference contour guide where user mask is missing
          r = Math.round(gray * 0.7 + 168 * 0.3);
          g = Math.round(gray * 0.7 + 85 * 0.3);
          b = Math.round(gray * 0.7 + 247 * 0.3);
        }

        const pIdx = (py * bufW + px) * 4;
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    const gridW = 40;
    const gridH = 40;
    const baseCell = (width / gridW) * zoom;
    const drawW = gridW * baseCell;
    const drawH = gridH * baseCell;
    const offsetX = (width - drawW) * 0.5;
    const offsetY = (height - drawH) * 0.5;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offCanvas, offsetX, offsetY, drawW, drawH);

    // Draw Synchronized Crosshairs (Clinical Thin Hairlines)
    const [crossU, crossV] = voxelToUv(sx, sy, sz);
    const cx = offsetX + (crossU + 0.5) * baseCell;
    const cy = offsetY + (crossV + 0.5) * baseCell;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Right-Hand Vertical Physical Calibration Scale Bar (iMed / Clinical PACS 10 cm Ruler)
    const rulerX = width - 16;
    const rulerTop = 55;
    const rulerBottom = height - 55;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rulerX, rulerTop);
    ctx.lineTo(rulerX, rulerBottom);
    const numTicks = 10;
    for (let t = 0; t <= numTicks; t++) {
      const ty = rulerTop + ((rulerBottom - rulerTop) * t) / numTicks;
      const tickLen = t % 5 === 0 ? 7 : 4;
      ctx.moveTo(rulerX - tickLen, ty);
      ctx.lineTo(rulerX, ty);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '500 9px "IBM Plex Mono", monospace';
    ctx.fillText(`${(40 * calibrationMm * 0.1).toFixed(1)} cm`, rulerX - 28, rulerBottom + 12);

    // Draw Automated Anatomical Landmarks
    for (const lm of landmarks) {
      const [lu, lv, isNear] = voxelToUv(lm.voxel[0], lm.voxel[1], lm.voxel[2]);
      if (isNear) {
        const lx = offsetX + (lu + 0.5) * baseCell;
        const ly = offsetY + (lv + 0.5) * baseCell;

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(lx, ly, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#02050A';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.font = '600 10px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(lm.code, lx + 7, ly + 3);
      }
    }

    // Draw Active Lasso Polygon
    if (lassoPoints.length > 1) {
      ctx.strokeStyle = '#FFD700';
      ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      lassoPoints.forEach(([lu, lv], idx) => {
        const lx = offsetX + (lu + 0.5) * baseCell;
        const ly = offsetY + (lv + 0.5) * baseCell;
        if (idx === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw Millimeter Calibration Caliper Line
    if (caliperPts.length > 0) {
      ctx.strokeStyle = '#FFD700';
      ctx.fillStyle = '#FFD700';
      ctx.lineWidth = 2;
      for (const [cu, cv] of caliperPts) {
        const px = offsetX + (cu + 0.5) * baseCell;
        const py = offsetY + (cv + 0.5) * baseCell;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (caliperPts.length === 2) {
        const x1 = offsetX + (caliperPts[0][0] + 0.5) * baseCell;
        const y1 = offsetY + (caliperPts[0][1] + 0.5) * baseCell;
        const x2 = offsetX + (caliperPts[1][0] + 0.5) * baseCell;
        const y2 = offsetY + (caliperPts[1][1] + 0.5) * baseCell;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (measuredMm !== null) {
          const mx = (x1 + x2) * 0.5;
          const my = (y1 + y2) * 0.5 - 8;
          ctx.fillStyle = 'rgba(2, 5, 10, 0.92)';
          ctx.fillRect(mx - 28, my - 11, 58, 16);
          ctx.fillStyle = '#FFD700';
          ctx.font = '600 11px "IBM Plex Mono", monospace';
          ctx.fillText(`${measuredMm.toFixed(2)} mm`, mx - 24, my + 1);
        }
      }
    }
  }, [
    volume,
    activeMask,
    slices,
    windowWidth,
    windowLevel,
    zoom,
    compareMode,
    calibrationMm,
    landmarks,
    lassoPoints,
    caliperPts,
    measuredMm,
  ]);

  const getUvFromPointerEvent = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [20, 20];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const gridW = 40;
    const baseCell = (canvas.width / gridW) * zoom;
    const offsetX = (canvas.width - gridW * baseCell) * 0.5;
    const offsetY = (canvas.height - gridW * baseCell) * 0.5;

    const u = Math.max(0, Math.min(39, Math.floor((cx - offsetX) / baseCell)));
    const v = Math.max(0, Math.min(39, Math.floor((cy - offsetY) / baseCell)));
    return [u, v];
  };

  const applyBrushEraseAtUv = (u: number, v: number) => {
    const toErase: number[] = [];
    for (let dv = -brushRadius; dv <= brushRadius; dv++) {
      for (let du = -brushRadius; du <= brushRadius; du++) {
        if (du * du + dv * dv <= brushRadius * brushRadius + 0.5) {
          const nu = u + du;
          const nv = v + dv;
          if (nu >= 0 && nu < 40 && nv >= 0 && nv < 40) {
            const [vx, vy, vz] = uvToVoxel(nu, nv);
            toErase.push(idx3D(vx, vy, vz));
          }
        }
      }
    }
    if (toErase.length > 0) {
      onEraseVoxels(toErase);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPointerDown(true);
    const [u, v] = getUvFromPointerEvent(e);
    const [vx, vy, vz] = uvToVoxel(u, v);

    if (activeTool === 'navigate') {
      onSliceChange([vx, vy, vz]);
    } else if (activeTool === 'brush') {
      applyBrushEraseAtUv(u, v);
    } else if (activeTool === 'lasso') {
      setLassoPoints([[u, v]]);
    } else if (activeTool === 'region_grow') {
      onSeedRegionGrow([vx, vy, vz]);
    } else if (activeTool === 'caliper') {
      if (caliperPts.length === 0 || caliperPts.length === 2) {
        setCaliperPts([[u, v]]);
        setMeasuredMm(null);
      } else if (caliperPts.length === 1) {
        const p0 = caliperPts[0];
        const du = u - p0[0];
        const dv = v - p0[1];
        const distVoxels = Math.sqrt(du * du + dv * dv);
        const distMm = Math.round(distVoxels * calibrationMm * 100) / 100;
        setCaliperPts([p0, [u, v]]);
        setMeasuredMm(distMm);
        onRecordMeasurement(distMm, plane.toUpperCase());
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [u, v] = getUvFromPointerEvent(e);
    const [vx, vy, vz] = uvToVoxel(u, v);
    setHoverCoords([vx, vy, vz]);
    setHoverHu(volume.huData[idx3D(vx, vy, vz)]);

    if (!isPointerDown) return;

    if (activeTool === 'navigate') {
      onSliceChange([vx, vy, vz]);
    } else if (activeTool === 'brush') {
      applyBrushEraseAtUv(u, v);
    } else if (activeTool === 'lasso') {
      setLassoPoints((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last[0] !== u || last[1] !== v) {
          return [...prev, [u, v]];
        }
        return prev;
      });
    }
  };

  const handlePointerUp = () => {
    if (isPointerDown && activeTool === 'lasso' && lassoPoints.length >= 3) {
      const toErase: number[] = [];
      for (let v = 0; v < 40; v++) {
        for (let u = 0; u < 40; u++) {
          if (pointInPolygon(u, v, lassoPoints)) {
            const [vx, vy, vz] = uvToVoxel(u, v);
            toErase.push(idx3D(vx, vy, vz));
          }
        }
      }
      if (toErase.length > 0) {
        onEraseVoxels(toErase);
      }
    }
    setLassoPoints([]);
    setIsPointerDown(false);
  };

  const handleSliderChange = (val: number) => {
    if (plane === 'axial') onSliceChange([sx, sy, val]);
    else if (plane === 'coronal') onSliceChange([sx, val, sz]);
    else onSliceChange([val, sy, sz]);
  };

  return (
    <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Viewport Header */}
      <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#0A192F]/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#0088AA] dark:text-[#00E5FF]">
            {language === 'en' ? planeMeta.titleEn : planeMeta.titleId}
          </span>
          <span className="text-xs text-slate-400" aria-hidden="true">
            ·
          </span>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
            Img: {planeMeta.sliceVal + 1}/{planeMeta.maxSlice + 1}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {measuredMm !== null && (
            <span className="text-[11px] font-mono text-[#FFD700] flex items-center gap-1 mr-1 tabular-nums">
              <Ruler className="w-3 h-3" />
              {measuredMm.toFixed(2)} mm
            </span>
          )}
          <button
            onClick={() => setZoom((z) => Math.max(1.0, Math.round((z - 0.25) * 100) / 100))}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
            {zoom.toFixed(2)}x
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.25, Math.round((z + 0.25) * 100) / 100))}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clinical PACS Pitch-Black 2D DICOM Canvas Container */}
      <div className="relative flex-1 bg-[#02050A] aspect-square max-h-[340px] w-full flex items-center justify-center overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full object-contain touch-none cursor-crosshair"
        />

        {/* Top-Left Clinical PACS Study Telemetry (iMed / 3D Slicer Reference Style) */}
        <div className="absolute top-2 left-2.5 text-[9.5px] font-mono text-slate-300/90 leading-tight pointer-events-none space-y-0.5 tabular-nums">
          <div className="text-[#00E5FF] font-semibold">Studio: KARINA-3D-CT</div>
          <div>Thick: {calibrationMm.toFixed(2)} mm</div>
          <div>Loc: {((planeMeta.sliceVal + 1) * calibrationMm).toFixed(2)} mm</div>
        </div>

        {/* Top-Right Clinical Series Metadata */}
        <div className="absolute top-2 right-6 text-[9.5px] font-mono text-slate-400 text-right leading-tight pointer-events-none space-y-0.5">
          <div>CT CRANIO-TMJ</div>
          <div>{planeMeta.seriesName}</div>
        </div>

        {/* Anatomical Orientation Markers */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          {planeMeta.orientTop}
        </span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          {planeMeta.orientBottom}
        </span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          {planeMeta.orientLeft}
        </span>
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-300 pointer-events-none">
          {planeMeta.orientRight}
        </span>

        {/* Bottom-Left Live Voxel & Hounsfield Unit Telemetry Readout */}
        <div className="absolute bottom-2 left-2.5 text-[9.5px] font-mono text-slate-300 pointer-events-none tabular-nums leading-tight">
          {hoverCoords && hoverHu !== null ? (
            <div>
              XYZ:[{hoverCoords[0]},{hoverCoords[1]},{hoverCoords[2]}] ·{' '}
              <strong className="text-[#00E5FF]">{hoverHu} HU</strong>
            </div>
          ) : (
            <div>
              XYZ:[{sx},{sy},{sz}] ·{' '}
              <strong className="text-[#00E5FF]">{volume.huData[idx3D(sx, sy, sz)]} HU</strong>
            </div>
          )}
          <div className="text-slate-400">
            Img: {planeMeta.sliceVal + 1} di {planeMeta.maxSlice + 1}
          </div>
        </div>

        {/* Bottom-Right WW / WL & Zoom Telemetry */}
        <div className="absolute bottom-2 right-6 text-[9.5px] font-mono text-slate-400 text-right pointer-events-none tabular-nums leading-tight">
          <div>Zoom: {zoom.toFixed(2)}</div>
          <div>
            WW: {windowWidth} WL: {windowLevel}
          </div>
        </div>
      </div>

      {/* Slice Navigation Slider Footer */}
      <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F]/70 flex items-center gap-3">
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          {language === 'en' ? 'Slice' : 'Irisan'}
        </span>
        <input
          type="range"
          min={0}
          max={planeMeta.maxSlice}
          value={planeMeta.sliceVal}
          onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-[#00E5FF] h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg cursor-pointer"
          aria-label={`${plane} slice slider`}
        />
      </div>
    </div>
  );
};
