import React from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw,
  Sliders,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { BiteAlignmentParams, ToothDescriptor } from './ThreeViewport';

interface TeethAlignmentOdontogramProps {
  language: Language;
  teeth: ToothDescriptor[];
  selectedToothId: string | null;
  biteParams: BiteAlignmentParams;
  highlightReplacedCyan: boolean;
  onSelectTooth: (toothId: string) => void;
  onToggleToothVisibility: (toothId: string) => void;
  onSetAllTeethVisibility: (visible: boolean) => void;
  onReplaceScatterCrownWithTooth: (toothId: string) => void;
  onUpdateToothTransform: (
    toothId: string,
    patch: Partial<
      Pick<ToothDescriptor, 'offsetX' | 'offsetY' | 'offsetZ' | 'tiltDeg' | 'rotYDeg' | 'scale' | 'status' | 'visible'>
    >,
  ) => void;
  onResetToothAlignment: (toothId: string) => void;
  onChangeBiteParams: (next: BiteAlignmentParams) => void;
  onToggleHighlightReplacedCyan: (val: boolean) => void;
}

/**
 * Renders an anatomically shaped tooth crown + root SVG silhouette for the odontogram bar
 */
const ToothSilhouetteSvg: React.FC<{
  kind: ToothDescriptor['kind'];
  arch: 'upper' | 'lower';
  status: ToothDescriptor['status'];
  visible: boolean;
  selected: boolean;
  highlightReplacedCyan: boolean;
}> = ({ kind, arch, status, visible, selected, highlightReplacedCyan }) => {
  const isUpper = arch === 'upper';

  let fillColor = '#E2E8F0';
  let strokeColor = '#64748B';
  if (!visible || status === 'hidden') {
    fillColor = 'transparent';
    strokeColor = '#475569';
  } else if (status === 'scatter_crown') {
    fillColor = '#F43FBC';
    strokeColor = '#FFD700';
  } else if (status === 'replaced') {
    fillColor = highlightReplacedCyan ? '#00E5FF' : '#F8FAFC';
    strokeColor = '#00E5FF';
  } else if (selected) {
    fillColor = '#E0F7FA';
    strokeColor = '#00E5FF';
  }

  // Flip vertically for lower arch so roots point down and crowns meet along the occlusal midline
  const transform = isUpper ? undefined : 'translate(0, 44) scale(1, -1)';

  // Crown + Root anatomical paths drawn in upper-arch orientation (root top y=2..22, crown bottom y=22..42)
  let pathD = '';
  if (kind === 'molar') {
    pathD =
      'M 5 22 C 4 14, 7 4, 10 3 C 12 3, 13 12, 15 14 C 17 12, 18 3, 20 3 C 23 4, 26 14, 25 22 C 28 24, 28 36, 24 40 C 21 42, 18 39, 15 40 C 12 39, 9 42, 6 40 C 2 36, 2 24, 5 22 Z';
  } else if (kind === 'premolar') {
    pathD =
      'M 8 22 C 8 13, 11 4, 15 3 C 19 4, 22 13, 22 22 C 25 25, 25 36, 21 40 C 18 42, 15 39, 12 40 C 8 38, 5 35, 5 28 C 5 25, 6 23, 8 22 Z';
  } else if (kind === 'canine') {
    pathD =
      'M 9 23 C 9 12, 12 2, 15 1 C 18 2, 21 12, 21 23 C 23 26, 23 34, 19 39 C 17 41, 15 43, 15 43 C 15 43, 13 41, 11 39 C 7 34, 7 26, 9 23 Z';
  } else {
    // Incisor
    pathD =
      'M 9 22 C 9 13, 12 4, 15 3 C 18 4, 21 13, 21 22 C 23 25, 23 36, 21 40 C 18 41, 12 41, 9 40 C 7 36, 7 25, 9 22 Z';
  }

  return (
    <svg viewBox="0 0 30 44" className="w-6 h-9 mx-auto block overflow-visible">
      <g transform={transform}>
        <path
          d={pathD}
          fill={fillColor}
          fillOpacity={!visible || status === 'hidden' ? 0.08 : status === 'scatter_crown' ? 0.85 : 0.92}
          stroke={selected ? '#00E5FF' : strokeColor}
          strokeWidth={selected ? 2 : 1.25}
          strokeDasharray={!visible || status === 'hidden' ? '2 2' : undefined}
        />
        {/* Subtle occlusal cusp / cervical line */}
        {visible && status !== 'hidden' && (
          <line
            x1="8"
            y1="23"
            x2="22"
            y2="23"
            stroke="#0A192F"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
        )}
      </g>
    </svg>
  );
};

export const TeethAlignmentOdontogram: React.FC<TeethAlignmentOdontogramProps> = ({
  language,
  teeth,
  selectedToothId,
  biteParams,
  highlightReplacedCyan,
  onSelectTooth,
  onToggleToothVisibility,
  onSetAllTeethVisibility,
  onReplaceScatterCrownWithTooth,
  onUpdateToothTransform,
  onResetToothAlignment,
  onChangeBiteParams,
  onToggleHighlightReplacedCyan,
}) => {
  const upperTeeth = teeth.filter((t) => t.arch === 'upper');
  const lowerTeeth = teeth.filter((t) => t.arch === 'lower');
  const selectedTooth = teeth.find((t) => t.id === selectedToothId) || teeth.find((t) => t.status === 'scatter_crown') || teeth[0];
  const scatterCrownsCount = teeth.filter((t) => t.status === 'scatter_crown' && t.visible).length;
  const replacedCount = teeth.filter((t) => t.status === 'replaced' && t.visible).length;

  return (
    <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
            {language === 'en'
              ? 'ANATOMICAL ODONTOGRAM · BITE ALIGNMENT & CROWN-SCATTER TOOTH REPLACEMENT'
              : 'ODONTOGRAM ANATOMIS · PENYELARASAN GIGITAN & PENGGANTIAN GIGI HAMBURAN MAHKOTA'}
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'Realistic 28-Tooth Bite Reconstruction & Virtual Tooth Placement'
              : 'Rekonstruksi Gigitan 28-Gigi Realistis & Penempatan Gigi Virtual'}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scatterCrownsCount > 0 && (
            <button
              onClick={() => {
                const firstScatter = teeth.find((t) => t.status === 'scatter_crown');
                if (firstScatter) {
                  onSelectTooth(firstScatter.id);
                  onReplaceScatterCrownWithTooth(firstScatter.id);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? `Clean Crown Scatter & Replace Tooth (${scatterCrownsCount})`
                  : `Bersihkan Hamburan & Ganti Gigi (${scatterCrownsCount})`}
              </span>
            </button>
          )}

          <button
            onClick={() => onSetAllTeethVisibility(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>{language === 'en' ? 'Show All 28' : 'Tampilkan 28'}</span>
          </button>
          <button
            onClick={() => onSetAllTeethVisibility(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'en' ? 'Hide All' : 'Sembunyikan'}</span>
          </button>
        </div>
      </div>

      {/* Visual Anatomical Odontogram Chart (Upper & Lower 14-Tooth Arches) */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#061224] border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
          <span>
            {language === 'en'
              ? 'CLICK ANY TOOTH TO SELECT & ALIGN · DOUBLE-CLICK TO HIDE/SHOW'
              : 'KLIK GIGI UNTUK MEMILIH & MENYELARASKAN · KLIK GANDA UNTUK SEMBUNYIKAN'}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-500 inline-block" />
              {language === 'en' ? 'Natural' : 'Alami'}
            </span>
            <span className="inline-flex items-center gap-1 text-fuchsia-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#F43FBC] border border-[#FFD700] inline-block" />
              {language === 'en' ? 'Scatter Crown' : 'Mahkota Hamburan'}
            </span>
            <span className="inline-flex items-center gap-1 text-[#00E5FF]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00E5FF] inline-block" />
              {language === 'en' ? `Virtual Tooth (${replacedCount})` : `Gigi Virtual (${replacedCount})`}
            </span>
          </div>
        </div>

        {/* Upper Maxillofacial Arch (#17 -> #27) */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1">
          {upperTeeth.map((tooth) => {
            const isSelected = selectedTooth?.id === tooth.id;
            return (
              <button
                key={tooth.id}
                onClick={() => onSelectTooth(tooth.id)}
                onDoubleClick={() => onToggleToothVisibility(tooth.id)}
                title={`${tooth.fdiNumber} · ${language === 'en' ? tooth.nameEn : tooth.nameId}`}
                className={`p-1 rounded-lg border transition-all cursor-pointer flex flex-col items-center ${
                  isSelected
                    ? 'bg-[#00E5FF]/15 border-[#00E5FF]'
                    : tooth.status === 'scatter_crown'
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/50 hover:border-[#FFD700]'
                      : 'bg-white/60 dark:bg-[#0A192F]/80 border-slate-200 dark:border-slate-800 hover:border-slate-500'
                }`}
              >
                <span className="text-[9.5px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  {tooth.fdiNumber}
                </span>
                <ToothSilhouetteSvg
                  kind={tooth.kind}
                  arch="upper"
                  status={tooth.status}
                  visible={tooth.visible}
                  selected={isSelected}
                  highlightReplacedCyan={highlightReplacedCyan}
                />
              </button>
            );
          })}
        </div>

        {/* Occlusal Bite Midline Divider */}
        <div className="flex items-center gap-2 py-0.5">
          <div className="h-px flex-1 bg-[#00E5FF]/35" />
          <span className="text-[9.5px] font-mono text-[#0088AA] dark:text-[#00E5FF] tracking-wider">
            {language === 'en' ? 'OCCLUSAL BITE PLANE' : 'BIDANG GIGITAN OKLUSAL'} · GAP:{' '}
            {biteParams.jawOpeningMm.toFixed(1)} mm
          </span>
          <div className="h-px flex-1 bg-[#00E5FF]/35" />
        </div>

        {/* Lower Mandibular Arch (#47 -> #37) */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1">
          {lowerTeeth.map((tooth) => {
            const isSelected = selectedTooth?.id === tooth.id;
            return (
              <button
                key={tooth.id}
                onClick={() => onSelectTooth(tooth.id)}
                onDoubleClick={() => onToggleToothVisibility(tooth.id)}
                title={`${tooth.fdiNumber} · ${language === 'en' ? tooth.nameEn : tooth.nameId}`}
                className={`p-1 rounded-lg border transition-all cursor-pointer flex flex-col items-center ${
                  isSelected
                    ? 'bg-[#00E5FF]/15 border-[#00E5FF]'
                    : tooth.status === 'scatter_crown'
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/50 hover:border-[#FFD700]'
                      : 'bg-white/60 dark:bg-[#0A192F]/80 border-slate-200 dark:border-slate-800 hover:border-slate-500'
                }`}
              >
                <ToothSilhouetteSvg
                  kind={tooth.kind}
                  arch="lower"
                  status={tooth.status}
                  visible={tooth.visible}
                  selected={isSelected}
                  highlightReplacedCyan={highlightReplacedCyan}
                />
                <span className="text-[9.5px] font-mono font-bold text-slate-600 dark:text-slate-300">
                  {tooth.fdiNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Inspector: Left = Selected Tooth Crown-Scatter Replacement & Micro-Alignment | Right = Global Bite Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selected Tooth Replacement & Fine Positioner */}
        {selectedTooth && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
                  {language === 'en' ? 'SELECTED TOOTH SOCKET' : 'SOKET GIGI TERPILIH'} ·{' '}
                  {selectedTooth.fdiNumber}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? selectedTooth.nameEn : selectedTooth.nameId}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleToothVisibility(selectedTooth.id)}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-[#112240] text-[11px] font-mono text-slate-700 dark:text-slate-200 hover:text-[#00E5FF] cursor-pointer"
                >
                  {selectedTooth.visible
                    ? language === 'en'
                      ? 'Hide'
                      : 'Sembunyi'
                    : language === 'en'
                      ? 'Restore'
                      : 'Tampilkan'}
                </button>
                <button
                  onClick={() => onResetToothAlignment(selectedTooth.id)}
                  className="p-1 rounded bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-300 hover:text-white cursor-pointer"
                  title={language === 'en' ? 'Auto-Snap to Natural Arch' : 'Kembalikan ke Lengkung Alami'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* One-Click Crown Scatter Cleanup & Virtual Tooth Replacement Action */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onReplaceScatterCrownWithTooth(selectedTooth.id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTooth.status === 'scatter_crown'
                    ? 'bg-[#00E5FF] text-[#0A192F] hover:bg-cyan-300'
                    : 'bg-[#00E5FF]/15 border border-[#00E5FF]/60 text-slate-900 dark:text-[#00E5FF] hover:bg-[#00E5FF]/25'
                }`}
              >
                {selectedTooth.status === 'replaced' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'en'
                        ? 'Virtual Tooth Seated (Re-Clean Area)'
                        : 'Gigi Virtual Terpasang (Bersihkan Ulang)'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {language === 'en'
                        ? 'Erase Scatter Here & Place Virtual Tooth'
                        : 'Hapus Hamburan & Pasang Gigi Virtual'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Fine Per-Tooth Alignment Sliders */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-mono tabular-nums">
              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Mesio-Distal (X)' : 'Geser X'}</span>
                  <span>{selectedTooth.offsetX.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  value={selectedTooth.offsetX}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      offsetX: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#00E5FF] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Vertical (Y)' : 'Tinggi Y'}</span>
                  <span>{selectedTooth.offsetY.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  value={selectedTooth.offsetY}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      offsetY: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#00E5FF] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Bucco-Lingual (Z)' : 'Maju-Mundur Z'}</span>
                  <span>{selectedTooth.offsetZ.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  value={selectedTooth.offsetZ}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      offsetZ: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#00E5FF] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Crown Tilt' : 'Kemiringan'}</span>
                  <span>{selectedTooth.tiltDeg.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={-22}
                  max={22}
                  step={1}
                  value={selectedTooth.tiltDeg}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      tiltDeg: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#FFD700] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Rotation' : 'Rotasi'}</span>
                  <span>{selectedTooth.rotYDeg.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={selectedTooth.rotYDeg}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      rotYDeg: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#FFD700] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{language === 'en' ? 'Tooth Size' : 'Skala Gigi'}</span>
                  <span>{Math.round(selectedTooth.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.25}
                  step={0.02}
                  value={selectedTooth.scale}
                  onChange={(e) =>
                    onUpdateToothTransform(selectedTooth.id, {
                      scale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#00E5FF] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Patient Bite & Occlusal Alignment Controls */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#FFD700]" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Patient Bite & Occlusal Alignment'
                  : 'Penyelarasan Gigitan & Oklusi Pasien'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onChangeBiteParams({
                    ...biteParams,
                    jawOpeningMm: 0,
                    mandibularShiftX: 0,
                    protrusionZ: 0,
                  })
                }
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#112240] text-[10px] font-mono text-slate-800 dark:text-[#00E5FF] cursor-pointer"
              >
                {language === 'en' ? 'Centric Bite' : 'Gigitan Normal'}
              </button>
              <button
                onClick={() =>
                  onChangeBiteParams({
                    ...biteParams,
                    jawOpeningMm: 6.0,
                  })
                }
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-[#112240] text-[10px] font-mono text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {language === 'en' ? 'Open 6mm' : 'Buka 6mm'}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-[11px] font-mono tabular-nums">
            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{language === 'en' ? 'Jaw Opening / Interocclusal Gap' : 'Bukaan Rahang / Celah Oklusal'}</span>
                <span className="text-[#0088AA] dark:text-[#00E5FF]">{biteParams.jawOpeningMm.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={0.2}
                value={biteParams.jawOpeningMm}
                onChange={(e) =>
                  onChangeBiteParams({
                    ...biteParams,
                    jawOpeningMm: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#00E5FF] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{language === 'en' ? 'Mandibular Midline Shift (L / R)' : 'Pergeseran Garis Tengah (Ki / Ka)'}</span>
                <span>{biteParams.mandibularShiftX.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={biteParams.mandibularShiftX}
                onChange={(e) =>
                  onChangeBiteParams({
                    ...biteParams,
                    mandibularShiftX: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#FFD700] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{language === 'en' ? 'Anterior-Posterior Bite (Overjet)' : 'Posisi Maju-Mundur Gigitan'}</span>
                <span>{biteParams.protrusionZ.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={biteParams.protrusionZ}
                onChange={(e) =>
                  onChangeBiteParams({
                    ...biteParams,
                    protrusionZ: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#FFD700] h-1 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Occlusal Plane & Replacement Shader Blend Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center justify-between gap-2 text-[11px] cursor-pointer px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
              <span>{language === 'en' ? 'Occlusal Bite Plane' : 'Bidang Oklusal 3D'}</span>
              <input
                type="checkbox"
                checked={biteParams.showOcclusalPlane}
                onChange={(e) =>
                  onChangeBiteParams({
                    ...biteParams,
                    showOcclusalPlane: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 accent-[#00E5FF]"
              />
            </label>

            <label className="flex items-center justify-between gap-2 text-[11px] cursor-pointer px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
              <span>{language === 'en' ? 'Highlight Virtual Teeth' : 'Sorot Gigi Virtual'}</span>
              <input
                type="checkbox"
                checked={highlightReplacedCyan}
                onChange={(e) => onToggleHighlightReplacedCyan(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#00E5FF]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
