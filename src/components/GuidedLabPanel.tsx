import React from 'react';
import {
  Award,
  CheckCircle2,
  Circle,
  Play,
  Target,
  Sparkles,
  Download,
} from 'lucide-react';
import { LAB_MODULES, Language } from '../i18n/translations';
import { ComparisonMetrics } from '../services/volumeGenerator';

interface GuidedLabPanelProps {
  language: Language;
  activeStepIndex: number;
  completedModuleIds: string[];
  comparisonMetrics: ComparisonMetrics;
  compareMode: boolean;
  onSelectStep: (idx: number) => void;
  onCompleteModule: (moduleId: string) => void;
  onRunGuidedStepAction: (stepNumber: number) => void;
  onToggleCompareMode: () => void;
  onExportStl: () => void;
}

export const GuidedLabPanel: React.FC<GuidedLabPanelProps> = ({
  language,
  activeStepIndex,
  completedModuleIds,
  comparisonMetrics,
  compareMode,
  onSelectStep,
  onCompleteModule,
  onRunGuidedStepAction,
  onToggleCompareMode,
  onExportStl,
}) => {
  const currentMod = LAB_MODULES[activeStepIndex] || LAB_MODULES[0];

  return (
    <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
      {/* Header & Milestone Progress */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <span className="text-xs font-mono text-[#FFD700] font-semibold">
            {language === 'en'
              ? 'STEP-BY-STEP VOCATIONAL LAB WORKFLOW'
              : 'ALUR KERJA LAB VOKASI LANGKAH-DEMI-LANGKAH'}
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? '5-Module CranioTMJ Segmentation Curriculum'
              : 'Kurikulum Segmentasi CranioTMJ 5-Modul'}
          </h2>
        </div>

        <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
          {completedModuleIds.length} / {LAB_MODULES.length}{' '}
          {language === 'en' ? 'Milestones Earned' : 'Modul Selesai'}
        </div>
      </div>

      {/* Step Selector Tabs */}
      <div className="grid grid-cols-5 gap-1.5">
        {LAB_MODULES.map((mod, idx) => {
          const isCompleted = completedModuleIds.includes(mod.id);
          const isCurrent = idx === activeStepIndex;
          return (
            <button
              key={mod.id}
              onClick={() => onSelectStep(idx)}
              className={`px-2 py-2 rounded-lg text-xs font-mono font-semibold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-[#00E5FF]/15 border-[#00E5FF] text-slate-900 dark:text-[#00E5FF]'
                  : isCompleted
                    ? 'bg-[#FFD700]/10 border-[#FFD700]/50 text-amber-800 dark:text-[#FFD700]'
                    : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                <span>M{mod.number}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Module Detail Card */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
              MODULE 0{currentMod.number}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'en' ? currentMod.titleEn : currentMod.titleId}
            </h3>
          </div>
          <span className="text-xs font-mono text-[#FFD700] flex items-center gap-1 shrink-0">
            <Award className="w-4 h-4" />
            {language === 'en' ? currentMod.badgeEn : currentMod.badgeId}
          </span>
        </div>

        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
          {language === 'en' ? currentMod.objectiveEn : currentMod.objectiveId}
        </p>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-[#112240] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          {language === 'en' ? currentMod.instructionEn : currentMod.instructionId}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => onRunGuidedStepAction(currentMod.number)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {language === 'en'
                ? `Demonstrate Step ${currentMod.number} in Workspace`
                : `Praktikkan Modul ${currentMod.number} Otomatis`}
            </span>
          </button>

          <button
            onClick={() => onCompleteModule(currentMod.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#FFD700]/60 text-slate-900 dark:text-[#FFD700] font-semibold text-xs hover:bg-[#FFD700]/10 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {completedModuleIds.includes(currentMod.id)
                ? language === 'en'
                  ? 'Milestone Verified'
                  : 'Modul Terverifikasi'
                : language === 'en'
                  ? 'Mark Module Complete'
                  : 'Tandai Modul Selesai'}
            </span>
          </button>
        </div>
      </div>

      {/* Compare Against Expert Reference Mesh Evaluation Scorecard */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00E5FF]" />
            <h3 className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {language === 'en'
                ? 'COMPARE AGAINST EXPERT REFERENCE MESH'
                : 'EVALUASI TERHADAP MESH REFERENSI AHLI'}
            </h3>
          </div>

          <button
            onClick={onToggleCompareMode}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
              compareMode
                ? 'bg-[#FFD700] text-[#0A192F]'
                : 'bg-slate-200 dark:bg-[#112240] text-slate-700 dark:text-slate-300'
            }`}
          >
            {compareMode
              ? language === 'en'
                ? 'Overlay: ON'
                : 'Overlay: AKTIF'
              : language === 'en'
                ? 'Overlay: OFF'
                : 'Overlay: NONAKTIF'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'Dice Similarity' : 'Skor Dice'}
            </p>
            <p className="text-lg font-mono font-bold text-[#0088AA] dark:text-[#00E5FF] tabular-nums">
              {comparisonMetrics.diceScore.toFixed(1)}%
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'Scatter Cleaned' : 'Hamburan Bersih'}
            </p>
            <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {comparisonMetrics.scatterRemovedPct.toFixed(1)}%
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'Bone Preserved' : 'TulangUtuh'}
            </p>
            <p className="text-lg font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {comparisonMetrics.bonePreservedPct.toFixed(1)}%
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'Islands Cleared' : 'Bebas Noise'}
            </p>
            <p className="text-lg font-mono font-bold text-amber-600 dark:text-[#FFD700] tabular-nums">
              {comparisonMetrics.islandsClearedPct.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono tabular-nums">
            {language === 'en' ? 'Remaining Scatter Voxels:' : 'Sisa Voksel Hamburan:'}{' '}
            <strong className="text-slate-900 dark:text-white">
              {comparisonMetrics.remainingScatterVoxels}
            </strong>
          </span>

          <button
            onClick={onExportStl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {language === 'en' ? 'Export Verified .STL Mesh' : 'Ekspor Mesh .STL Terverifikasi'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
