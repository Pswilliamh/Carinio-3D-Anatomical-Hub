import React, { useRef, useState } from 'react';
import {
  X,
  Upload,
  FolderOpen,
  FileArchive,
  ShieldCheck,
  CheckCircle2,
  Download,
  AlertCircle,
  Layers,
  Link2,
} from 'lucide-react';
import { Language } from '../i18n/translations';
import { CachedVolumeRecord } from '../services/indexedDbCache';
import {
  buildSampleDicomPart10Blob,
  DicomImportProgress,
  DicomImportResult,
  importDicomOrVolumeFiles,
} from '../services/dicomImporter';
import { getGoogleDriveAccessToken, signInWithGoogle } from '../firebase';

interface DicomImportModalProps {
  language: Language;
  currentVolume: CachedVolumeRecord | null;
  onClose: () => void;
  onImportComplete: (result: DicomImportResult) => void;
}

export const DicomImportModal: React.FC<DicomImportModalProps> = ({
  language,
  currentVolume,
  onClose,
  onImportComplete,
}) => {
  const [targetGridSize, setTargetGridSize] = useState<48 | 64>(64);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DicomImportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<DicomImportResult | null>(null);
  const [driveUrl, setDriveUrl] = useState('');

  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    setPreviewResult(null);
    setIsProcessing(true);
    try {
      const result = await importDicomOrVolumeFiles(files, targetGridSize, (p) => {
        setProgress(p);
      });
      setPreviewResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to parse DICOM dataset.';
      setErrorMsg(msg);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleImportFromGoogleDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = driveUrl.trim();
    if (!trimmed) return;

    const idMatch =
      trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) ||
      trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);

    if (!idMatch) {
      setErrorMsg(
        language === 'en'
          ? 'Invalid Google Drive link. Paste a Google Drive .dcm, .zip, or DICOM folder link.'
          : 'Tautan Google Drive tidak valid. Tempel tautan file .dcm, .zip, atau folder DICOM.',
      );
      return;
    }

    const fileOrFolderId = idMatch[1];
    const isFolder = trimmed.includes('/folders/');

    setErrorMsg(null);
    setPreviewResult(null);
    setIsProcessing(true);
    setProgress({
      stage: 'reading',
      percent: 10,
      messageEn: 'Connecting to Google Drive to download DICOM dataset...',
      messageId: 'Menghubungkan ke Google Drive untuk mengunduh dataset DICOM...',
    });

    try {
      let token = getGoogleDriveAccessToken();
      if (!token) {
        await signInWithGoogle();
        token = getGoogleDriveAccessToken();
      }
      if (!token) {
        throw new Error(
          language === 'en'
            ? 'Google Drive sign-in is required to fetch DICOM files from Drive.'
            : 'Masuk dengan Google Drive diperlukan untuk mengambil file DICOM dari Drive.',
        );
      }

      const downloadedFiles: File[] = [];

      if (isFolder) {
        const q = encodeURIComponent(`'${fileOrFolderId}' in parents and trashed = false`);
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=120&fields=files(id,name,mimeType)`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!listRes.ok) throw new Error('Unable to read Google Drive DICOM folder.');
        const data = (await listRes.json()) as {
          files?: Array<{ id: string; name: string; mimeType: string }>;
        };
        const entries = (data.files || []).filter(
          (f) => f.mimeType !== 'application/vnd.google-apps.folder',
        );
        if (entries.length === 0) {
          throw new Error('No DICOM files found inside that Google Drive folder.');
        }

        for (let i = 0; i < entries.length; i++) {
          const item = entries[i];
          setProgress({
            stage: 'reading',
            percent: Math.round(12 + (i / entries.length) * 30),
            messageEn: `Downloading from Drive (${i + 1}/${entries.length}): ${item.name}`,
            messageId: `Mengunduh dari Drive (${i + 1}/${entries.length}): ${item.name}`,
          });
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (mediaRes.ok) {
            const blob = await mediaRes.blob();
            downloadedFiles.push(new File([blob], item.name));
          }
        }
      } else {
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileOrFolderId}?fields=id,name,mimeType`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const meta = metaRes.ok
          ? ((await metaRes.json()) as { name?: string })
          : { name: 'drive_import.dcm' };
        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileOrFolderId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!mediaRes.ok) {
          throw new Error('Unable to download file from Google Drive. Check sharing permissions.');
        }
        const blob = await mediaRes.blob();
        downloadedFiles.push(new File([blob], meta.name || 'drive_import.dcm'));
      }

      const result = await importDicomOrVolumeFiles(downloadedFiles, targetGridSize, (p) => {
        setProgress(p);
      });
      setPreviewResult(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to download DICOM dataset from Google Drive.';
      setErrorMsg(msg);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSampleDicom = () => {
    if (!currentVolume) return;
    const blob = buildSampleDicomPart10Blob(currentVolume);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Karina3DLab_Sample_CranioTMJ.dcm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#112240] border border-[#00E5FF]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
              <Layers className="w-4 h-4" />
              <span>DICOM PART 10 CT SERIES IMPORTER</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'en'
                ? 'Import DICOM Dataset (.DCM Series, Folder, .ZIP, .NII)'
                : 'Impor Dataset DICOM (Seri .DCM, Folder, .ZIP, .NII)'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#112240] text-slate-700 dark:text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close DICOM Importer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Privacy & Local Processing Notice */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 dark:text-white">
                {language === 'en'
                  ? '100% Client-Side Anonymized DICOM Processing:'
                  : 'Pemrosesan DICOM Anonim 100% di Browser Lokal:'}
              </strong>{' '}
              {language === 'en'
                ? 'Your CT DICOM slices are parsed directly in browser memory using Hounsfield Unit (HU) Rescale Slope/Intercept tags. Patient identity tags are stripped and files are never uploaded to external servers.'
                : 'Irisan CT DICOM diproses langsung di memori browser menggunakan kalibrasi Unit Hounsfield (HU). Tag identitas pasien disembunyikan dan file tidak pernah diunggah ke server eksternal.'}
            </div>
          </div>

          {/* Target Volumetric Grid Resolution Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold">
              {language === 'en'
                ? '3D RECONSTRUCTION RESOLUTION:'
                : 'RESOLUSI REKONSTRUKSI 3D:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetGridSize(48)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors border ${
                  targetGridSize === 48
                    ? 'bg-[#00E5FF] text-[#0A192F] border-[#00E5FF] font-bold'
                    : 'bg-slate-100 dark:bg-[#0A192F] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                48³ {language === 'en' ? 'Fast (Tablet)' : 'Cepat (Tablet)'}
              </button>
              <button
                type="button"
                onClick={() => setTargetGridSize(64)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors border ${
                  targetGridSize === 64
                    ? 'bg-[#00E5FF] text-[#0A192F] border-[#00E5FF] font-bold'
                    : 'bg-slate-100 dark:bg-[#0A192F] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                64³ {language === 'en' ? 'High Detail (Recommended)' : 'Detail Tinggi (Disarankan)'}
              </button>
            </div>
          </div>

          {/* Drag & Drop Zone + Folder / Multi-File Buttons */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center space-y-4 transition-colors ${
              isDragging
                ? 'border-[#00E5FF] bg-[#00E5FF]/10'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0A192F]/70'
            }`}
          >
            <div className="mx-auto w-11 h-11 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
              <Upload className="w-5 h-5 text-[#0088AA] dark:text-[#00E5FF]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Drag & drop DICOM slices (.dcm), a DICOM .zip archive, or .nii files here'
                  : 'Tarik & letakkan irisan DICOM (.dcm), arsip .zip DICOM, atau file .nii di sini'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'Supports multi-slice CT stacks, extensionless PACS DICOM folders, multi-frame Enhanced CT DICOM, .ZIP archives, and NIfTI (.nii).'
                  : 'Mendukung tumpukan irisan CT multi-slice, folder DICOM PACS tanpa ekstensi, DICOM multi-frame, arsip .ZIP, dan NIfTI (.nii).'}
              </p>
            </div>

            {/* Hidden file & directory inputs */}
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept=".dcm,.dicom,.ima,.zip,.nii,.json,*/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) processFiles(files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is supported across Chromium, Safari, and Firefox
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) processFiles(files);
                e.target.value = '';
              }}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>
                  {language === 'en'
                    ? 'Select DICOM Series Folder'
                    : 'Pilih Folder Seri DICOM'}
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => multiFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-[#112240] border border-slate-700 hover:border-[#00E5FF] text-white font-semibold text-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                <FileArchive className="w-4 h-4 text-[#FFD700]" />
                <span>
                  {language === 'en'
                    ? 'Select .DCM / .ZIP / .NII Files'
                    : 'Pilih File .DCM / .ZIP / .NII'}
                </span>
              </button>
            </div>
          </div>

          {/* Import DICOM directly from Google Drive Link */}
          <form onSubmit={handleImportFromGoogleDrive} className="space-y-2">
            <label className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold block">
              {language === 'en'
                ? 'OR IMPORT DICOM FOLDER / .ZIP / .DCM FROM GOOGLE DRIVE:'
                : 'ATAU IMPOR FOLDER DICOM / .ZIP / .DCM DARI GOOGLE DRIVE:'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/... or /file/d/..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !driveUrl.trim()}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-semibold text-slate-900 dark:text-[#00E5FF] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                {language === 'en' ? 'Load from Drive' : 'Muat dari Drive'}
              </button>
            </div>
          </form>

          {/* Progress Bar */}
          {progress && isProcessing && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0A192F] border border-[#00E5FF]/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                <span>{language === 'en' ? progress.messageEn : progress.messageId}</span>
                <span className="tabular-nums">{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00E5FF] transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed DICOM Dataset Summary & Confirm Load Card */}
          {previewResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {language === 'en'
                      ? 'DICOM Volume Parsed & Calibrated Successfully'
                      : 'Volume DICOM Berhasil Dibaca & Dikalibrasi'}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#FFD700] font-semibold">
                  {previewResult.meta.modality} · {previewResult.record.dims.join('×')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-white/80 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">Series</div>
                  <div className="text-slate-900 dark:text-white font-semibold truncate">
                    {previewResult.meta.seriesDescription}
                  </div>
                </div>
                <div className="p-2 rounded bg-white/80 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">Source Matrix</div>
                  <div className="text-slate-900 dark:text-white font-semibold">
                    {previewResult.meta.originalMatrix}
                  </div>
                </div>
                <div className="p-2 rounded bg-white/80 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">Spacing / Thick</div>
                  <div className="text-slate-900 dark:text-white font-semibold">
                    {previewResult.meta.pixelSpacingMm[0].toFixed(2)} /{' '}
                    {previewResult.meta.sliceThicknessMm.toFixed(2)} mm
                  </div>
                </div>
                <div className="p-2 rounded bg-white/80 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400">HU Range</div>
                  <div className="text-slate-900 dark:text-[#00E5FF] font-semibold">
                    {previewResult.meta.huMin} .. +{previewResult.meta.huMax}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onImportComplete(previewResult);
                  onClose();
                }}
                className="w-full py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-bold text-xs hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                {language === 'en'
                  ? 'Load DICOM Dataset into 4-View MPR & 3D Workstation'
                  : 'Muat Dataset DICOM ke Stasiun Kerja MPR & 3D'}
              </button>
            </div>
          )}
        </div>

        {/* Footer with Downloadable Real Sample .DCM File */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A192F] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {language === 'en'
              ? 'Need a valid .DCM test file? Export the current phantom as DICOM Part 10:'
              : 'Butuh file uji .DCM valid? Ekspor fantom saat ini sebagai DICOM Part 10:'}
          </span>
          <button
            type="button"
            onClick={handleDownloadSampleDicom}
            disabled={!currentVolume}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-300 dark:border-slate-700 hover:border-[#FFD700] text-slate-800 dark:text-[#FFD700] font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Download Sample .DCM' : 'Unduh Sampel .DCM'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
