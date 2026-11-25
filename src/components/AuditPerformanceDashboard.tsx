import React from 'react';
import {
  FileText,
  ShieldCheck,
  Database,
  Activity,
  Lock,
  CloudUpload,
  CheckCircle2,
} from 'lucide-react';
import { LocalAuditRecord } from '../services/indexedDbCache';
import { exportAuditLogEntryToPDF } from '../services/meshExporters';
import { Language } from '../i18n/translations';

interface AuditPerformanceDashboardProps {
  language: Language;
  auditLogs: LocalAuditRecord[];
  userDisplayName: string | null;
  userEmail: string | null;
  userRole: 'student' | 'technician' | 'instructor' | 'admin';
  cacheLatencyMs: number;
  meshComputeMs: number;
  triangleCount: number;
  diceScore: number;
  minHU: number;
  maxHU: number;
  calibrationMm: number;
  isSyncingCloud: boolean;
  onSyncToCloud: () => void;
  onChangeRole: (newRole: 'student' | 'technician') => void;
}

export const AuditPerformanceDashboard: React.FC<AuditPerformanceDashboardProps> = ({
  language,
  auditLogs,
  userDisplayName,
  userEmail,
  userRole,
  cacheLatencyMs,
  meshComputeMs,
  triangleCount,
  diceScore,
  minHU,
  maxHU,
  calibrationMm,
  isSyncingCloud,
  onSyncToCloud,
  onChangeRole,
}) => {
  return (
    <div className="space-y-8 pb-12">
      {/* Top 4-Card System Performance, IndexedDB Latency, RBAC & Encryption Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
            <span>INDEXEDDB CACHE LATENCY</span>
            <Database className="w-4 h-4" />
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            {cacheLatencyMs.toFixed(1)} ms
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'en'
              ? 'Offline volumetric & mesh store active'
              : 'Penyimpanan volumetrik & mesh offline aktif'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-[#FFD700]">
            <span>MARCHING CUBES KERNEL</span>
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
            {meshComputeMs.toFixed(1)} ms
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {triangleCount.toLocaleString()} surface triangles · {calibrationMm.toFixed(2)} mm
          </p>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <span>DATA ENCRYPTION & HIPAA GATE</span>
            <Lock className="w-4 h-4" />
          </div>
          <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
            AES-256 / SHA-256
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'en'
              ? 'Virtualized training phantom data only'
              : 'Khusus data fantom pelatihan tervirtualisasi'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
            <span>RBAC ACCESS CONTROL</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-mono font-bold text-slate-900 dark:text-white uppercase">
              {userRole}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onChangeRole('student')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  userRole === 'student'
                    ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                    : 'bg-slate-100 dark:bg-[#0A192F] text-slate-500'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => onChangeRole('technician')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  userRole === 'technician'
                    ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                    : 'bg-slate-100 dark:bg-[#0A192F] text-slate-500'
                }`}
              >
                Tech
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {userEmail || (language === 'en' ? 'Local Training Session' : 'Sesi Pelatihan Lokal')}
          </p>
        </div>
      </div>

      {/* Audit Log Header & Cloud Synchronization Action */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
              IMMUTABLE COMPLIANCE & CALIBRATION AUDIT LOG
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {language === 'en'
                ? 'System Activity Logs & Individual PDF Certificate Export'
                : 'Log Aktivitas Sistem & Ekspor Laporan PDF per Entri'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'en'
                ? 'Every segmentation threshold change, scatter cleanup, calibration measurement, and 3D export is hashed and exportable as a formal PDF report.'
                : 'Setiap perubahan ambang HU, pembersihan hamburan, pengukuran kalibrasi mm, dan ekspor 3D dicatat dengan hash enkripsi dan dapat diekspor ke PDF.'}
            </p>
          </div>

          <button
            onClick={onSyncToCloud}
            disabled={isSyncingCloud}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            <CloudUpload className="w-4 h-4" />
            <span>
              {isSyncingCloud
                ? language === 'en'
                  ? 'Syncing to Cloud Firestore...'
                  : 'Menyinkronkan ke Firestore...'
                : language === 'en'
                  ? 'Sync Session & Logs to Cloud'
                  : 'Sinkronkan Sesi & Log ke Cloud'}
            </span>
          </button>
        </div>

        {/* Audit Logs Table with Exportable PDF Report button on every row */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F]/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">OPERATOR</th>
                <th className="py-3 px-4">ACTION TYPE</th>
                <th className="py-3 px-4">DETAILS & TELEMETRY</th>
                <th className="py-3 px-4">PRECISION</th>
                <th className="py-3 px-4">ENCRYPTED DIGEST</th>
                <th className="py-3 px-4 text-right">PDF REPORT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {auditLogs.map((log) => (
                <tr
                  key={log.logId}
                  className="hover:bg-slate-50 dark:hover:bg-[#0A192F]/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                    {new Date(log.createdAtIso).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {log.actorName || userDisplayName || 'Vocational Trainee'}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#0088AA] dark:text-[#00E5FF] whitespace-nowrap">
                    {log.actionType}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      [{log.moduleName}]
                    </span>{' '}
                    {log.details}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#FFD700] whitespace-nowrap tabular-nums">
                    ±{log.accuracyMm.toFixed(2)} mm
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {log.encryptedHash.slice(0, 22)}...
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => exportAuditLogEntryToPDF(log, diceScore, minHU, maxHU)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-[#0A192F] hover:bg-[#00E5FF] hover:text-[#0A192F] text-slate-700 dark:text-slate-200 font-mono text-[11px] font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Export PDF' : 'Unduh PDF'}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-500 dark:text-slate-400 font-mono text-xs"
                  >
                    {language === 'en'
                      ? 'No audit log entries recorded yet. Perform any segmentation or measurement action to generate a log.'
                      : 'Belum ada entri log audit. Lakukan tindakan segmentasi atau pengukuran untuk mencatat log.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
