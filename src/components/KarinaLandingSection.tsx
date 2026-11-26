import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Layers,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Wrench,
  BookOpen,
  CheckCircle2,
  Upload,
  Film,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Language, UI_TEXT } from '../i18n/translations';
import { getGoogleDriveAccessToken, signInWithGoogle } from '../firebase';
import {
  BUILTIN_VIDEO_LIBRARY,
  LANDING_DRIVE_FOLDER_ID,
  LibraryVideoItem,
} from '../data/videoLibrary';
import { VideoLibraryPanel } from './VideoLibraryPanel';

export { LANDING_DRIVE_FOLDER_ID };

interface KarinaLandingSectionProps {
  language: Language;
  userDisplayName: string | null;
  userRole: string;
  onSignIn: () => void;
  onEnterWorkstation: () => void;
  onEnterImplantDesign: () => void;
  onEnterGlossary: () => void;
  onNotify?: (msg: string) => void;
}

export const KarinaLandingSection: React.FC<KarinaLandingSectionProps> = ({
  language,
  userDisplayName,
  userRole,
  onSignIn,
  onEnterWorkstation,
  onEnterImplantDesign,
  onEnterGlossary,
  onNotify,
}) => {
  const t = UI_TEXT[language];
  const [promoVideos, setPromoVideos] = useState<LibraryVideoItem[]>(BUILTIN_VIDEO_LIBRARY);
  const [activePromoId, setActivePromoId] = useState<string>(BUILTIN_VIDEO_LIBRARY[0].id);
  const [heroMuted, setHeroMuted] = useState(true);
  const [syncingDrive, setSyncingDrive] = useState(false);

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const activePromo =
    promoVideos.find((v) => v.id === activePromoId) || promoVideos[0];

  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.muted = heroMuted;
    }
  }, [heroMuted, activePromoId]);

  // Optionally sync any newly added MP4 promos from the Google Drive landing folder directly into inline <video> blobs
  const handleSyncAdditionalDrivePromos = useCallback(async () => {
    setSyncingDrive(true);
    try {
      let token = getGoogleDriveAccessToken();
      if (!token) {
        await signInWithGoogle();
        token = getGoogleDriveAccessToken();
      }
      if (!token) {
        setSyncingDrive(false);
        return;
      }

      const q = encodeURIComponent(
        `'${LANDING_DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType contains 'video/'`,
      );
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=name&pageSize=12&fields=files(id,name,mimeType,description)`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) {
        throw new Error(
          language === 'en'
            ? 'Could not check Google Drive folder for additional promo videos.'
            : 'Tidak dapat memeriksa folder Google Drive untuk video promo tambahan.',
        );
      }

      const data = (await res.json()) as {
        files?: Array<{ id: string; name: string; mimeType: string; description?: string }>;
      };

      const existingIds = new Set(promoVideos.map((v) => v.driveFileId));
      const newVideos: LibraryVideoItem[] = [];

      for (const f of data.files || []) {
        if (existingIds.has(f.id)) continue;
        const mediaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!mediaRes.ok) continue;
        const blob = await mediaRes.blob();
        const objectUrl = URL.createObjectURL(blob);
        const indexLabel = String(promoVideos.length + newVideos.length + 1).padStart(2, '0');
        newVideos.push({
          id: `drive_promo_${f.id}`,
          driveFileId: f.id,
          src: objectUrl,
          poster: '/src/assets/images/hero_karina_craniotmj_promo_1795440953726.jpg',
          category: 'biomechanics',
          durationLabel: 'DRIVE VIDEO',
          isNew: true,
          titleEn: `${f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}`,
          titleId: `${f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}`,
          subtitleEn:
            f.description || 'Embedded training video loaded from Karina 3D Lab Drive folder.',
          subtitleId:
            f.description || 'Video pelatihan tertanam yang dimuat dari folder Drive Karina 3D Lab.',
          badgeEn: `DRIVE VIDEO ${indexLabel}`,
          badgeId: `VIDEO DRIVE ${indexLabel}`,
          tags: ['Google Drive', 'Training'],
        });
      }

      if (newVideos.length > 0) {
        setPromoVideos((prev) => [...newVideos, ...prev]);
        setActivePromoId(newVideos[0].id);
        onNotify?.(
          language === 'en'
            ? `Embedded ${newVideos.length} additional video(s) into the Video Library.`
            : `Menambahkan ${newVideos.length} video baru ke Pustaka Video.`,
        );
      } else {
        onNotify?.(
          language === 'en'
            ? 'All 6 videos from your Google Drive folder are already embedded in the Video Library.'
            : 'Semua 6 video dari folder Google Drive Anda sudah tertanam di Pustaka Video.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Drive sync error';
      onNotify?.(msg);
    } finally {
      setSyncingDrive(false);
    }
  }, [language, onNotify, promoVideos]);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HERO GRID: Inline Embedded Promo Video Player + App Overview & Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Columns: Embedded Native HTML5 Promo Video Player (Never Leaves Page) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="relative bg-black aspect-video w-full overflow-hidden">
            <video
              key={activePromo.id}
              ref={heroVideoRef}
              src={activePromo.src}
              poster={activePromo.poster}
              controls
              autoPlay
              muted={heroMuted}
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-contain bg-black"
            />

            {/* Discreet Top-Left Embedded Reel Indicator & Quick Audio Toggle */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-[#0A192F]/85 border border-[#00E5FF]/50 rounded-md px-2.5 py-1 text-[11px] font-mono font-semibold text-[#00E5FF] flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>{language === 'en' ? activePromo.badgeEn : activePromo.badgeId}</span>
              </div>

              <button
                onClick={() => setHeroMuted((m) => !m)}
                className="pointer-events-auto bg-[#0A192F]/85 border border-slate-700 hover:border-[#00E5FF] rounded-md px-2.5 py-1 text-[11px] font-mono text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title={heroMuted ? 'Unmute video' : 'Mute video'}
              >
                {heroMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>{language === 'en' ? 'Unmute' : 'Suara'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>{language === 'en' ? 'Sound On' : 'Aktif'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Inline Promo Reel Switcher Bar (Switch Embedded Videos Right Inside Hero) */}
          <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#0A192F] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {promoVideos.map((vid, idx) => {
                const isSelected = vid.id === activePromo.id;
                const shortLabel =
                  vid.id === 'promo_5'
                    ? language === 'en'
                      ? '01 · Bionic TMJ'
                      : '01 · TMJ Bionik'
                    : vid.id === 'promo_6'
                      ? language === 'en'
                        ? '02 · 3D Bioprinting'
                        : '02 · Bioprinting 3D'
                      : vid.id === 'promo_4'
                        ? language === 'en'
                          ? '03 · Biomechanics'
                          : '03 · Biomekanika'
                        : `0${idx + 1} · Reel`;
                return (
                  <button
                    key={vid.id}
                    onClick={() => setActivePromoId(vid.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#00E5FF] text-[#0A192F]'
                        : 'bg-white dark:bg-[#112240] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF]'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
              {language === 'en' ? activePromo.titleEn : activePromo.titleId}
            </span>
          </div>

          {/* App Title, Welcome Line, App Description & Direct Workspace CTAs */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
            <div className="space-y-1.5">
              <div className="text-xs font-mono font-semibold text-[#0088AA] dark:text-[#00E5FF]">
                {language === 'en'
                  ? 'VOCATIONAL BIOMEDICAL CT SEGMENTATION & IMPLANT CAD PLATFORM'
                  : 'PLATFORM VOKASI SEGMENTASI CT BIOMEDIS & DESAIN CAD IMPLAN'}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Karina 3D Lab
              </h1>
              <p className="text-sm md:text-base font-medium text-[#0088AA] dark:text-[#00E5FF]">
                {t.welcomeAssistant}
              </p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'en'
                  ? 'Interactive Indonesian & English Vocational Workstation for CT Segmentation, Scatter Artifact Cleanup, and 3D Skeletal Anatomical Modeling and computer tomography. Built as a practical, zero-install browser training platform emulating clinical segmentation and patient-specific implant CAD workflows for students and medical-device technicians.'
                  : 'Stasiun Kerja Vokasi Bilingual (Indonesia & Inggris) untuk Segmentasi CT, Pembersihan Artefak Hamburan, serta Pemodelan Anatomi Rangka 3D dan Computed Tomography. Dirancang sebagai platform pelatihan tanpa instalasi yang meniru alur kerja segmentasi klinis dan desain CAD implan bagi mahasiswa serta teknisi alat kesehatan.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onEnterWorkstation}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-sm hover:bg-cyan-300 transition-colors cursor-pointer"
              >
                <span>
                  {language === 'en' ? 'Launch 4-View Workstation' : 'Buka Stasiun Kerja 4-Layar'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onEnterImplantDesign}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FFD700]/15 border border-[#FFD700]/70 text-amber-900 dark:text-[#FFD700] font-semibold text-sm hover:bg-[#FFD700]/25 transition-colors cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>
                  {language === 'en' ? 'Open Implant Design Lab' : 'Buka Lab Desain Implan'}
                </span>
              </button>
              <button
                onClick={onEnterGlossary}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:border-[#00E5FF] transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#0088AA] dark:text-[#00E5FF]" />
                <span>
                  {language === 'en' ? 'Gallery & PDF Library' : 'Galeri & Pustaka PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Trainee Sign-In Portal & Core Capabilities Summary */}
        <div className="lg:col-span-4 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                TRAINEE & INSTRUCTOR PORTAL
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                RBAC: {userRole.toUpperCase()}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'en'
                ? 'Cloud Session Sync & Competency Portal'
                : 'Sinkronisasi Sesi Cloud & Portal Kompetensi'}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'en'
                ? 'Sign in with Google to save CT segmentation sessions, track your 5-step vocational lab milestones, load clinical DICOM datasets from Drive, and generate encrypted PDF audit certificates.'
                : 'Masuk dengan Google untuk menyimpan sesi segmentasi CT, memantau progres 5 langkah lab vokasi, memuat dataset DICOM klinis dari Drive, dan mencetak sertifikat audit PDF terenkripsi.'}
            </p>

            {userDisplayName ? (
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-[#00E5FF]/40 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  <span>{userDisplayName}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Cloud Sync: ACTIVE · Role: {userRole} · AES-256/SHA
                </p>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-white text-[#1f1f1f] border border-[#747775] hover:bg-slate-50 font-medium text-sm transition-colors cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{t.signInGoogle}</span>
              </button>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
              {language === 'en' ? 'KEY TRAINING CAPABILITIES' : 'KEMAMPUAN PELATIHAN UTAMA'}
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Upload className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Direct DICOM (.dcm / folder / .zip) & NIfTI (.nii) volumetric import.'
                    : 'Impor volumetrik langsung DICOM (.dcm / folder / .zip) & NIfTI (.nii).'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? '4-Color Layer Separation (Cyan, Green, Yellow, Magenta) in 2D & 3D.'
                    : 'Pemisahan 4 Warna Lapisan (Cyan, Hijau, Kuning, Magenta) di 2D & 3D.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Implant Design Lab: Spline contouring, normal extrusion & Fit Heatmap.'
                    : 'Lab Desain Implan: Konturing spline, ekstrusi normal & Peta Celah.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Watertight Binary .STL, .OBJ & ISO-10303 .STEP export at 0.5 mm scale.'
                    : 'Ekspor kedap air .STL, .OBJ & ISO-10303 .STEP pada skala 0,5 mm.'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. EMBEDDED VIDEO LIBRARY + BIOMECHANICS BENCHMARKS */}
      <div className="space-y-4">
        {/* Biomechanical Research Highlights Featured in Our TMJ Documentary Series */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono font-semibold text-[#0088AA] dark:text-[#00E5FF]">
              {language === 'en' ? 'PEAK INTERFACE STRESS' : 'TEGANGAN ANTARMUKA PUNCAK'}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              9.2× {language === 'en' ? 'Lower' : 'Lebih Rendah'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {language === 'en'
                ? '3,420 kPa (hard-soft) → 370 kPa (FGM 90–0)'
                : '3.420 kPa (keras-lunak) → 370 kPa (FGM 90–0)'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {language === 'en' ? 'CONDYLAR MOBILITY' : 'MOBILITAS KONDILUS'}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              +88% {language === 'en' ? 'Translation' : 'Translasi'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {language === 'en'
                ? '170 μm (rigid) → 320 μm natural glide'
                : '170 μm (kaku) → 320 μm luncur alami'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono font-semibold text-amber-600 dark:text-[#FFD700]">
              {language === 'en' ? 'JOINT REACTION FORCE' : 'GAYA REAKSI SENDI'}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              -10% {language === 'en' ? 'Peak Load' : 'Beban Puncak'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {language === 'en'
                ? 'Incisal clench 167 N → 153 N · LGF 151 → 137 N'
                : 'Gigitan insisal 167 N → 153 N · LGF 151 → 137 N'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono font-semibold text-fuchsia-600 dark:text-fuchsia-400">
              {language === 'en' ? 'TPMS GYROID & FGM' : 'TPMS GYROID & FGM'}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'en' ? 'Lattice → Cartilage' : 'Kisi → Tulang Rawan'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {language === 'en'
                ? 'Porous titanium-to-voxelized cartilage bioprinting'
                : 'Bioprinting titanium berpori ke tulang rawan voxel'}
            </div>
          </div>
        </div>

        <VideoLibraryPanel
          language={language}
          videos={promoVideos}
          activeVideoId={activePromoId}
          onSelectVideo={(vid) => {
            setActivePromoId(vid.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSyncDrive={handleSyncAdditionalDrivePromos}
          syncingDrive={syncingDrive}
        />
      </div>

      {/* 3. COMPLETE APP DESCRIPTION & ARCHITECTURE OVERVIEW */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="max-w-3xl space-y-1.5">
          <p className="text-xs font-mono font-semibold text-[#0088AA] dark:text-[#00E5FF]">
            {language === 'en' ? 'ABOUT KARINA 3D LAB' : 'TENTANG KARINA 3D LAB'}
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'End-to-End Clinical CT Segmentation & Patient-Specific Implant Training'
              : 'Pelatihan Segmentasi CT Klinis & Desain Implan Khusus Pasien Menyeluruh'}
          </h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'en'
              ? 'Karina 3D Lab bridges the gap between classroom biomedical theory and real medical-device production labs. Learners practice every step required to turn raw DICOM Computed Tomography scans into clean, multi-layered 3D anatomical models and custom-contoured implants ready for SLA/DMLS 3D printing or CNC milling.'
              : 'Karina 3D Lab menjembatani teori biomedis di kelas dengan laboratorium produksi alat kesehatan nyata. Peserta mempraktikkan setiap tahap untuk mengubah pindaian CT DICOM mentah menjadi model anatomi 3D multi-lapisan yang bersih serta implan berkontur presisi yang siap dicetak 3D SLA/DMLS atau pemesinan CNC.'}
          </p>
        </div>

        {/* 4 Core Module Description Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              tag: '01 · DICOM & 4-VIEW MPR WORKSTATION',
              titleEn: 'Synchronized Axial, Coronal, Sagittal & 3D WebGL Viewports',
              titleId: 'Layar Sinkron Aksial, Koronal, Sagital & WebGL 3D',
              descEn:
                'Load built-in skull/TMJ phantoms or import real multi-slice DICOM series (.dcm, folders, .zip) and NIfTI (.nii) volumes. Inspect bone, soft tissue, and metal windows with a 10 cm clinical scale bar and millimeter caliper ruler.',
              descId:
                'Muat dataset tengkorak/TMJ bawaan atau impor seri DICOM asli (.dcm, folder, .zip) dan volume NIfTI (.nii). Periksa jendela tulang, jaringan lunak, dan logam dengan skala klinis 10 cm serta penggaris milimeter.',
              ctaEn: 'Open 4-View Workstation →',
              ctaId: 'Buka Stasiun Kerja 4-Layar →',
              onClick: onEnterWorkstation,
            },
            {
              tag: '02 · 4-COLOR LAYER SEPARATION & SCATTER CLEANUP',
              titleEn: 'Cyan, Green, Yellow & Magenta Multi-Layer Segmentation',
              titleId: 'Segmentasi Multi-Lapisan Cyan, Hijau, Kuning & Magenta',
              descEn:
                'Calibrate Hounsfield Unit thresholds (+350..+2450 HU), automatically separate Mandible, Cranium/Fossa, Dentition/Condyle, and Metal Scatter into 4 toggleable color layers, paint layers on 2D slices, run Region Growing, and erase beam-hardening streaks.',
              descId:
                'Kalibrasi ambang Unit Hounsfield (+350..+2450 HU), pisahkan Mandibula, Kranium/Fosa, Gigi/Kondilus, dan Hamburan Logam ke 4 warna lapisan, cat lapisan di irisan 2D, jalankan Region Growing, dan hapus artefak logam.',
              ctaEn: 'Try 4-Color Segmentation →',
              ctaId: 'Coba Segmentasi 4-Warna →',
              onClick: onEnterWorkstation,
            },
            {
              tag: '03 · PATIENT-SPECIFIC IMPLANT DESIGN LAB',
              titleEn: 'Surface Spline Contouring, Normal Extrusion & Fit Heatmap',
              titleId: 'Konturing Spline Permukaan, Ekstrusi Normal & Peta Celah',
              descEn:
                'Design TMJ Ramus Prostheses, Cranial Vault Cranioplasty Plates, and Mandibular Bridging Plates. Drag 2D spline control handles, conform curvature to host bone (<0.40 mm gap), extrude thickness with feathered edge bevels, and export .STL / .STEP.',
              descId:
                'Rancang Prostesis Ramus TMJ, Pelat Kranioplasti Kranial, dan Pelat Jembatan Mandibula. Seret titik spline 2D, sesuaikan kontur ke tulang (<0,40 mm), ekstrusi ketebalan dengan bevel halus, dan ekspor .STL / .STEP.',
              ctaEn: 'Launch Implant Design Lab →',
              ctaId: 'Buka Lab Desain Implan →',
              onClick: onEnterImplantDesign,
            },
            {
              tag: '04 · VISUAL GALLERY, PDF REVIEW & AUDIT TELEMETRY',
              titleEn: 'Google Drive Library, AI PDF Overview & Compliance Logs',
              titleId: 'Pustaka Google Drive, Tinjauan PDF AI & Log Audit',
              descEn:
                'Import clinical imagery and curriculum PDFs from Google Drive for instant bilingual summaries, inspect 28 sculpted teeth with bite alignment & virtual crown-scatter replacement alongside the Inferior Alveolar Nerve canal, and download encrypted PDF competency reports.',
              descId:
                'Impor gambar klinis dan modul PDF dari Google Drive untuk ringkasan bilingual otomatis, periksa 28 gigi terpahat dengan penyelarasan gigitan & penggantian mahkota hamburan virtual serta kanalis Saraf Mandibula, lalu unduh laporan audit PDF terenkripsi.',
              ctaEn: 'Open Gallery & PDF Library →',
              ctaId: 'Buka Galeri & Pustaka PDF →',
              onClick: onEnterGlossary,
            },
          ].map((card, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#0088AA] dark:text-[#00E5FF]">
                  {card.tag}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? card.titleEn : card.titleId}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === 'en' ? card.descEn : card.descId}
                </p>
              </div>
              <button
                onClick={card.onClick}
                className="text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
              >
                {language === 'en' ? card.ctaEn : card.ctaId}
              </button>
            </div>
          ))}
        </div>

        {/* 5-Stage Training Workflow Checklist Strip */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mb-3">
            {language === 'en'
              ? 'STANDARD VOCATIONAL WORKFLOW IN KARINA 3D LAB'
              : 'ALUR KERJA PELATIHAN STANDAR DI KARINA 3D LAB'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
            {[
              { en: '1. Import CT / DICOM', id: '1. Impor CT / DICOM' },
              { en: '2. 4-Color HU Masking', id: '2. Mask HU 4-Warna' },
              { en: '3. Scatter Cleanup & Grow', id: '3. Bersihkan Hamburan' },
              { en: '4. Design & Contour Implant', id: '4. Desain Kontur Implan' },
              { en: '5. Export .STL / .STEP', id: '5. Ekspor .STL / .STEP' },
            ].map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#112240] border border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                <span className="truncate">{language === 'en' ? step.en : step.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. VISUAL REFERENCE ARTWORK CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-[#0A192F] relative overflow-hidden">
            <img
              src="/src/assets/images/hero_karina_craniotmj_promo_1795440953726.jpg"
              alt="3D Cranium and TMJ Condyle Segmentation Landmarks"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                01. CRANIO-TMJ SEGMENTATION
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {language === 'en'
                  ? 'Hounsfield Thresholding & 4-Color Masks'
                  : 'Ambang Hounsfield & Mask 4-Warna'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Isolate cortical bone, paint Cyan/Green/Yellow/Magenta anatomical layers, trim metallic scatter streaks, and separate the mandibular condyle.'
                  : 'Isolasi tulang kortikal, warnai lapisan anatomi Cyan/Hijau/Kuning/Magenta, pangkas hamburan logam, dan pisahkan kondilus mandibula.'}
              </p>
            </div>
            <button
              onClick={onEnterWorkstation}
              className="mt-3 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
            >
              {language === 'en' ? 'Open MPR & 3D Viewports →' : 'Buka Tampilan MPR & 3D →'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-[#0A192F] relative overflow-hidden">
            <img
              src="/src/assets/images/diagram_tmj_condyle_anatomy_1795440952547.jpg"
              alt="TMJ Condyle, Glenoid Fossa, Teeth, and Inferior Alveolar Nerve Canal Diagram"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-[#FFD700]">
                02. IMPLANT DESIGN & CONTOURING
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {language === 'en'
                  ? 'Parametric Surface Extrusion & Bone Fit'
                  : 'Ekstrusi Permukaan Parametrik & Uji Pas'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Shape patient-specific TMJ, cranial vault, and mandibular implants with bone-contact gap heatmaps, feathered edges, and locking screws.'
                  : 'Rancang implan khusus pasien untuk TMJ, kubah kranial, dan mandibula dengan peta celah tulang, tepi bevel halus, dan sekrup fiksasi.'}
              </p>
            </div>
            <button
              onClick={onEnterImplantDesign}
              className="mt-3 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
            >
              {language === 'en' ? 'Launch Implant Design Lab →' : 'Buka Lab Desain Implan →'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="aspect-[4/3] bg-[#0A192F] relative overflow-hidden">
            <img
              src="/src/assets/images/diagram_3d_printing_laser_scan_1795440953581.jpg"
              alt="Optical Laser Scanner, SLA 3D Printed Mandible, and Titanium TMJ Prosthetic Implant"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                03. ADDITIVE MANUFACTURING & LIBRARY
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {language === 'en'
                  ? 'SLA/DMLS 3D Printing & PDF Reference Library'
                  : 'Cetak 3D SLA/DMLS & Pustaka Referensi PDF'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Export calibrated .STL, .OBJ, and ISO-10303 .STEP files and review clinical reference PDFs and imagery synced from Google Drive.'
                  : 'Ekspor file .STL, .OBJ, dan .STEP terkalibrasi serta tinjau referensi PDF dan gambar klinis yang disinkronkan dari Google Drive.'}
              </p>
            </div>
            <button
              onClick={onEnterGlossary}
              className="mt-3 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
            >
              {language === 'en' ? 'Open Gallery & PDF Library →' : 'Buka Galeri & Pustaka PDF →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
