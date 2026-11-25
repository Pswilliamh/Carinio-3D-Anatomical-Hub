import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Cpu,
  ShieldCheck,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { Language, UI_TEXT } from '../i18n/translations';

interface KarinaLandingSectionProps {
  language: Language;
  userDisplayName: string | null;
  userRole: string;
  onSignIn: () => void;
  onEnterWorkstation: () => void;
  onEnterGuidedLab: () => void;
  onEnterGlossary: () => void;
}

interface PromoChapter {
  timeStart: number;
  timeEnd: number;
  titleEn: string;
  titleId: string;
  captionEn: string;
  captionId: string;
  hudMetric: string;
}

const PROMO_CHAPTERS: PromoChapter[] = [
  {
    timeStart: 0,
    timeEnd: 6,
    titleEn: '01. Multi-Planar CT Acquisition & Hounsfield Calibration',
    titleId: '01. Akuisisi CT Multi-Planar & Kalibrasi Unit Hounsfield',
    captionEn:
      'Synchronized Axial, Coronal, and Sagittal slices isolate cortical craniomaxillofacial bone between +350 and +2400 HU.',
    captionId:
      'Irisan Aksial, Koronal, dan Sagital yang tersinkronisasi mengisolasi tulang kortikal kraniomaksilofasial antara +350 hingga +2400 HU.',
    hudMetric: 'CT SLICE: 0.50 mm | WINDOW: BONE (+350..+2400 HU)',
  },
  {
    timeStart: 6,
    timeEnd: 12,
    titleEn: '02. Dental Metal Scatter Cleanup & Condyle Region Growing',
    titleId: '02. Pembersihan Hamburan Logam Gigi & Region Growing Kondilus',
    captionEn:
      'Trimming dental amalgam beam-hardening rays and separating the Mandibular Condyle from the Glenoid Fossa.',
    captionId:
      'Memangkas pancaran hamburan tambalan gigi dan memisahkan Kondilus Mandibula dari Fosa Glenoid.',
    hudMetric: 'SCATTER REMOVED: 99.2% | REGION GROW: CONDYLE ISOLATED',
  },
  {
    timeStart: 12,
    timeEnd: 18,
    titleEn: '03. Mandibular Nerve Canal Mapping & Tooth Extraction Planning',
    titleId: '03. Pemetaan Kanalis Saraf Mandibula & Perencanaan Gigi',
    captionEn:
      'Visualizing the Inferior Alveolar Nerve pathway in 3D alongside individually toggleable upper and lower teeth.',
    captionId:
      'Memvisualisasikan jalur Saraf Alveolaris Inferior dalam 3D beserta set gigi atas dan bawah yang dapat diatur.',
    hudMetric: 'IAN NERVE CANAL: MAPPED | DENTITION: 16 TEETH ACTIVE',
  },
  {
    timeStart: 18,
    timeEnd: 24,
    titleEn: '04. Optical Laser Surface Scanning & Titanium TMJ Prosthetic Fit',
    titleId: '04. Pemindaian Permukaan Laser Optik & Uji Pas Prostetik Titanium',
    captionEn:
      'Aligning sub-millimeter laser surface scan meshes with SLA 3D printed models and Ti-6Al-4V custom condylar implants.',
    captionId:
      'Menyelaraskan pemindaian permukaan laser sub-milimeter dengan cetakan 3D SLA dan implan kondilus titanium.',
    hudMetric: 'CALIBRATION: 0.50 mm | EXPORT: .STL / .OBJ / .STEP',
  },
];

export const KarinaLandingSection: React.FC<KarinaLandingSectionProps> = ({
  language,
  userDisplayName,
  userRole,
  onSignIn,
  onEnterWorkstation,
  onEnterGuidedLab,
  onEnterGlossary,
}) => {
  const t = UI_TEXT[language];
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 24;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/src/assets/images/hero_karina_craniotmj_promo_1795440953726.jpg';
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setCurrentTime((prev) => (prev + 0.1 >= duration ? 0 : prev + 0.1));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Render animated procedural promo video frame onto the media player canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0A192F';
    ctx.fillRect(0, 0, w, h);

    // Draw generated clinical skull backdrop with subtle pan/zoom
    if (bgImgRef.current) {
      const zoom = 1.02 + Math.sin(currentTime * 0.25) * 0.02;
      const dw = w * zoom;
      const dh = h * zoom;
      const dx = (w - dw) * 0.5;
      const dy = (h - dh) * 0.5;
      ctx.globalAlpha = 0.72;
      ctx.drawImage(bgImgRef.current, dx, dy, dw, dh);
      ctx.globalAlpha = 1.0;
    }

    // Dark clinical gradient scrim for high-contrast telemetry & captions
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(10, 25, 47, 0.55)');
    grad.addColorStop(0.55, 'rgba(10, 25, 47, 0.25)');
    grad.addColorStop(1, 'rgba(10, 25, 47, 0.92)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Animated Cyan CT Laser Scan Line sweeping vertically across the cranium & TMJ
    const scanY = ((currentTime * 65) % (h * 0.75)) + h * 0.1;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, scanY);
    ctx.lineTo(w - 40, scanY);
    ctx.stroke();

    // Animated TMJ Condyle Target Crosshair & Golden Mandibular Nerve Arc
    const condyleX = w * 0.62;
    const condyleY = h * 0.42;
    const pulseRadius = 26 + Math.sin(currentTime * 4) * 5;

    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(condyleX, condyleY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair ticks
    ctx.beginPath();
    ctx.moveTo(condyleX - 42, condyleY);
    ctx.lineTo(condyleX + 42, condyleY);
    ctx.moveTo(condyleX, condyleY - 42);
    ctx.lineTo(condyleX, condyleY + 42);
    ctx.stroke();

    // Golden Inferior Alveolar Nerve Pathway visualization curve
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(condyleX, condyleY + 18);
    ctx.quadraticCurveTo(condyleX - 25, condyleY + 115, condyleX - 155, condyleY + 150);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top-left live HUD label
    ctx.fillStyle = '#00E5FF';
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.fillText('KARINA 3D LAB // PROMO WALKTHROUGH', 28, 34);
  }, [currentTime]);

  const activeChapter =
    PROMO_CHAPTERS.find((c) => currentTime >= c.timeStart && currentTime < c.timeEnd) ||
    PROMO_CHAPTERS[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Grid: Left Media Player & Welcome Virtual Assistant | Right Google Auth & Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Columns: Karina Promo Media Player + Mandatory "Welcome to this virtual assistant" */}
        <div className="lg:col-span-8 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="relative bg-[#0A192F] aspect-video w-full overflow-hidden">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              className="w-full h-full object-cover"
            />

            {/* Overlay Chapter Title & Bilingual Subtitles */}
            <div className="absolute bottom-14 left-4 right-4 md:left-6 md:right-6 pointer-events-none">
              <div className="bg-[#0A192F]/90 border border-[#00E5FF]/40 rounded-lg p-3.5 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-[#FFD700]">
                    {language === 'en' ? activeChapter.titleEn : activeChapter.titleId}
                  </span>
                  <span className="text-[11px] font-mono text-[#00E5FF] tabular-nums">
                    {activeChapter.hudMetric}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-white leading-snug">
                  {language === 'en' ? activeChapter.captionEn : activeChapter.captionId}
                </p>
              </div>
            </div>

            {/* Interactive Media Player Transport Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-[#0A192F]/95 border-t border-slate-800 px-4 py-2.5 flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded bg-[#00E5FF] text-[#0A192F] hover:bg-cyan-300 transition-colors"
                aria-label={isPlaying ? 'Pause Promo Video' : 'Play Promo Video'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setCurrentTime(0)}
                className="p-1.5 rounded text-slate-300 hover:text-white transition-colors"
                aria-label="Restart Video"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="flex-1 accent-[#00E5FF] h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                aria-label="Promo Video Timeline"
              />

              <span className="text-xs font-mono text-slate-300 tabular-nums shrink-0">
                00:{Math.floor(currentTime).toString().padStart(2, '0')} / 00:{duration}
              </span>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded text-slate-300 hover:text-white transition-colors"
                aria-label="Toggle Audio"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Under Media Player: Required App Title & "Welcome to this virtual assistant" */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Karina 3D Lab
              </h1>
              <p className="text-base md:text-lg font-medium text-[#0088AA] dark:text-[#00E5FF]">
                {t.welcomeAssistant}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'Interactive Indonesian & English Vocational Workstation for CT Segmentation, Scatter Artifact Cleanup, and 3D Skeletal Anatomical Modeling and computer tomography.'
                  : 'Stasiun Kerja Vokasi Bilingual (Indonesia & Inggris) untuk Segmentasi CT, Pembersihan Artefak Hamburan, serta Pemodelan Anatomi Rangka 3D dan Computed Tomography.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
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
                onClick={onEnterGuidedLab}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#FFD700]/60 text-slate-900 dark:text-[#FFD700] font-semibold text-sm hover:bg-[#FFD700]/10 transition-colors cursor-pointer"
              >
                <span>{language === 'en' ? 'Start 5-Step Guided Lab' : 'Mulai Lab Terpandu'}</span>
              </button>
              <button
                onClick={onEnterGlossary}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#00E5FF]/60 text-slate-900 dark:text-[#00E5FF] font-semibold text-sm hover:bg-[#00E5FF]/10 transition-colors cursor-pointer"
              >
                <span>
                  {language === 'en'
                    ? 'Open Gallery & PDF Library'
                    : 'Buka Galeri & Pustaka PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: User Login Portal (Google Email Auth + RBAC) & Vocational Modules Overview */}
        <div className="lg:col-span-4 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                GOOGLE WORKSPACE / EMAIL PORTAL
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                RBAC: {userRole.toUpperCase()}
              </span>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {language === 'en'
                ? 'Technician & Student Authentication Portal'
                : 'Portal Autentikasi Teknisi & Mahasiswa'}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'en'
                ? 'Sign in with your Google email account (passwordless OAuth) to synchronize CT segmentation masks, 5-step lab milestones, and encrypted PDF audit certificates across laptop and tablet devices.'
                : 'Masuk dengan akun email Google Anda (OAuth tanpa kata sandi) untuk menyinkronkan mask segmentasi CT, progres lab 5 langkah, dan sertifikat audit PDF terenkripsi di perangkat laptop maupun tablet.'}
            </p>

            {userDisplayName ? (
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-[#00E5FF]/40 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  <span>{userDisplayName}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Cloud Sync: ACTIVE · Role: {userRole} · Encryption: AES-256/SHA
                </p>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-[#0A192F] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.signInGoogle}</span>
              </button>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
              {language === 'en'
                ? 'CORE VOCATIONAL COMPETENCIES'
                : 'KOMPETENSI VOKASI UTAMA'}
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? '4-Screen MPR & 3D WebGL Workstation with 0.5–1.0 mm calibration.'
                    : 'Stasiun Kerja 4-Layar MPR & WebGL 3D dengan kalibrasi 0,5–1,0 mm.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Interactive Maxillofacial & Mandibular Teeth + Inferior Alveolar Nerve Opacity.'
                    : 'Set Gigi Maksilofasial & Mandibula Interaktif + Opasitas Saraf Mandibula.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Direct .STL, .OBJ & ISO-10303 .STEP Export for SLA 3D Printers & Laser Scanners.'
                    : 'Ekspor langsung .STL, .OBJ & .STEP untuk Printer 3D SLA & Pemindai Laser.'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Visual Reference Cards using our generated domain artwork with Zero-Broken-Image fallback */}
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
                  ? 'Hounsfield Thresholding & Scatter Cleanup'
                  : 'Ambang Batas Hounsfield & Pembersihan Hamburan'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Isolate cortical bone (300–3000 HU), trim metallic dental filling beam-hardening rays slice-by-slice, and separate the mandibular condyle via Region Growing.'
                  : 'Isolasi tulang kortikal (300–3000 HU), pangkas pancaran hamburan tambalan logam per irisan, dan pisahkan kondilus mandibula dengan Region Growing.'}
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
                02. NERVE CANAL & DENTITION
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {language === 'en'
                  ? 'Mandibular Nerve Pathway & Tooth Sets'
                  : 'Jalur Saraf Mandibula & Set Gigi Interaktif'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Inspect the inferior alveolar nerve canal with adjustable opacity alongside 16 individually removable maxillofacial and mandibular teeth.'
                  : 'Periksa kanalis saraf alveolaris inferior dengan opasitas yang dapat diatur beserta 16 gigi maksilofasial dan mandibula yang dapat disembunyikan satu per satu.'}
              </p>
            </div>
            <button
              onClick={onEnterGuidedLab}
              className="mt-3 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
            >
              {language === 'en' ? 'Explore Guided Anatomy Lab →' : 'Jelajahi Lab Anatomi Terpandu →'}
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
                03. ADDITIVE MANUFACTURING & LASER SCAN
              </p>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {language === 'en'
                  ? 'SLA/DMLS 3D Printing & Titanium Prosthetics'
                  : 'Cetak 3D SLA/DMLS & Prostetik Titanium'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Export watertight .STL, .OBJ, and ISO-10303 .STEP files calibrated at 0.5–1.0 mm accuracy with optical laser surface scan alignment.'
                  : 'Ekspor file .STL, .OBJ, dan ISO-10303 .STEP kedap air yang dikalibrasi pada akurasi 0,5–1,0 mm dengan penyelarasan pemindai laser optik.'}
              </p>
            </div>
            <button
              onClick={onEnterGlossary}
              className="mt-3 text-xs font-semibold text-[#0088AA] dark:text-[#00E5FF] hover:underline text-left cursor-pointer"
            >
              {language === 'en' ? 'Open AI Glossary & 3D Tech Guide →' : 'Buka Glosarium AI & Panduan 3D →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
