import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Upload,
  Link2,
  ExternalLink,
  CheckCircle2,
  X,
  RefreshCw,
  Eye,
  BookOpen,
} from 'lucide-react';
import {
  getGoogleDriveAccessToken,
  signInWithGoogle,
} from '../firebase';
import { Language } from '../i18n/translations';

export interface GalleryImageItem {
  id: string;
  titleEn: string;
  titleId: string;
  category: 'Clinical CT / MPR' | '3D Volume Render' | 'Google Drive Import' | 'PACS Reference';
  imageUrl: string;
  captionEn: string;
  captionId: string;
  sourceLabel: string;
  driveFileId?: string;
}

export interface PdfLibraryItem {
  id: string;
  titleEn: string;
  titleId: string;
  sourceLabel: string;
  pageCountLabel: string;
  driveFileId?: string;
  embedUrl?: string;
  pdfBase64?: string;
  summaryTextEn: string;
  summaryTextId: string;
  fullTextContent: string;
  initialOverviewEn: string;
  initialOverviewId: string;
}

const BUILTIN_GALLERY_IMAGES: GalleryImageItem[] = [
  {
    id: 'img_ref_1',
    titleEn: '3D Multi-Planar Craniofacial CT Volume Rendering (10 cm Scale)',
    titleId: 'Rendering Volume CT Kraniofasial Multi-Planar 3D (Skala 10 cm)',
    category: '3D Volume Render',
    imageUrl: '/assets/aistudio/Screenshot_20261123_213903_Chrome_79435f21.jpg',
    captionEn:
      'Clinical 4-pane DICOM viewer reference showing realistic ivory bone volume rendering with cavity ambient occlusion, 10 cm vertical scale bar, and coronal temporal bone slice.',
    captionId:
      'Referensi penampil DICOM 4-layar yang menampilkan rendering volume tulang gading realistis dengan bayangan rongga, mistar skala 10 cm, dan irisan tulang temporal koronal.',
    sourceLabel: 'Clinical Reference #01',
  },
  {
    id: 'img_ref_2',
    titleEn: 'Synchronized Axial, Sagittal & 3D Cranial Reconstruction',
    titleId: 'Rekonstruksi Kranial Aksial, Sagital & 3D Tersinkronisasi',
    category: 'Clinical CT / MPR',
    imageUrl: '/assets/aistudio/Screenshot_20261123_213627_Chrome_7222a26c.jpg',
    captionEn:
      'Multi-planar reconstruction demonstrating synchronized axial base, sagittal condylar fossa, coronal mastoid air cells, and 3D maxillofacial dentition.',
    captionId:
      'Rekonstruksi multi-planar yang menunjukkan sinkronisasi basis aksial, fosa kondilus sagital, sel udara mastoid koronal, dan set gigi maksilofasial 3D.',
    sourceLabel: 'Clinical Reference #02',
  },
  {
    id: 'img_ref_3',
    titleEn: 'High-Contrast Coronal Temporal Bone & TMJ Fossa Window',
    titleId: 'Window Tulang Temporal Koronal & Fosa TMJ Kontras Tinggi',
    category: 'Clinical CT / MPR',
    imageUrl: '/assets/aistudio/Screenshot_20261123_213645_Chrome_26651f67.jpg',
    captionEn:
      'Bilinear smoothed DICOM bone window (WW: 2000, WL: 400) highlighting cortical bone boundaries and radiolucent joint space.',
    captionId:
      'Window tulang DICOM halus bilinear (WW: 2000, WL: 400) yang menyoroti batas tulang kortikal dan celah sendi radiolusen.',
    sourceLabel: 'Clinical Reference #03',
  },
  {
    id: 'img_ref_4',
    titleEn: 'Volumetric Skull Reconstruction & Dental Arch Inspection',
    titleId: 'Rekonstruksi Tengkorak Volumetrik & Inspeksi Lengkung Gigi',
    category: '3D Volume Render',
    imageUrl: '/assets/aistudio/Screenshot_20261123_213641_Chrome_352da194.jpg',
    captionEn:
      'High-detail orbital rim, nasal aperture, zygomatic arch, and upper/lower tooth crown illumination used as the shading benchmark for Karina 3D Lab.',
    captionId:
      'Detail tinggi tepi orbita, bukaan hidung, lengkung zigomatik, dan pencahayaan mahkota gigi atas/bawah yang menjadi tolok ukur shading Karina 3D Lab.',
    sourceLabel: 'Clinical Reference #04',
  },
  {
    id: 'img_ref_5',
    titleEn: 'PACS Dose & Modality Telemetry Archive Reference',
    titleId: 'Referensi Arsip Telemetri Dosis & Modalitas PACS',
    category: 'PACS Reference',
    imageUrl: '/assets/aistudio/Screenshot_20261123_213722_Chrome_362e0aa4.jpg',
    captionEn:
      'Clinical PACS study list and dosimetry histogram dashboard for quality assurance and series metadata indexing.',
    captionId:
      'Daftar studi PACS klinis dan dasbor histogram dosimetri untuk jaminan kualitas serta pengindeksan metadata seri.',
    sourceLabel: 'Clinical Reference #05',
  },
  {
    id: 'img_ref_6',
    titleEn: '3D Cranio-TMJ Segmentation Landmarks & Nerve Pathway',
    titleId: 'Titik Anatomi Segmentasi Kranio-TMJ 3D & Jalur Saraf',
    category: '3D Volume Render',
    imageUrl: '/src/assets/images/hero_karina_craniotmj_promo_1795440953726.jpg',
    captionEn:
      'Karina 3D Lab anatomical landmark guide illustrating the Mandibular Condyle, Glenoid Fossa, and Inferior Alveolar Nerve pathway.',
    captionId:
      'Panduan titik anatomi Karina 3D Lab yang mengilustrasikan Kondilus Mandibula, Fosa Glenoid, dan jalur Saraf Alveolaris Inferior.',
    sourceLabel: 'Karina 3D Lab Asset',
  },
  {
    id: 'img_ref_7',
    titleEn: 'TMJ Condyle, Glenoid Fossa & Mandibular Canal Diagram',
    titleId: 'Diagram Kondilus TMJ, Fosa Glenoid & Kanalis Mandibula',
    category: 'Clinical CT / MPR',
    imageUrl: '/src/assets/images/diagram_tmj_condyle_anatomy_1795440952547.jpg',
    captionEn:
      'Educational cross-section of the temporomandibular joint synovial space (1.5–3.0 mm), coronoid process, and inferior alveolar nerve.',
    captionId:
      'Penampang edukasi celah sinovial sendi temporomandibular (1,5–3,0 mm), prosesus koronoideus, dan saraf alveolaris inferior.',
    sourceLabel: 'Karina 3D Lab Asset',
  },
  {
    id: 'img_ref_8',
    titleEn: 'Optical Laser Surface Scanner & SLA/DMLS 3D Printing Workflow',
    titleId: 'Alur Kerja Pemindai Permukaan Laser Optik & Cetak 3D SLA/DMLS',
    category: '3D Volume Render',
    imageUrl: '/src/assets/images/diagram_3d_printing_laser_scan_1795440953581.jpg',
    captionEn:
      'Sub-millimeter (0.5–1.0 mm) laser surface registration with SLA resin anatomical prints and Ti-6Al-4V custom condylar prostheses.',
    captionId:
      'Registrasi permukaan laser sub-milimeter (0,5–1,0 mm) dengan cetakan anatomi resin SLA dan prostetik kondilus titanium Ti-6Al-4V.',
    sourceLabel: 'Karina 3D Lab Asset',
  },
];

const BUILTIN_PDF_LIBRARY: PdfLibraryItem[] = [
  {
    id: 'pdf_karina_tmj_handbook',
    titleEn: 'Karina 3D Lab — CT Segmentation, Dental Scatter Cleanup & 3D TMJ Modeling Manual.pdf',
    titleId: 'Karina 3D Lab — Modul Panduan Segmentasi CT, Pembersihan Hamburan Gigi & Pemodelan TMJ 3D.pdf',
    sourceLabel: 'Pre-Loaded Curriculum PDF',
    pageCountLabel: '14 Pages · EN / ID Bilingual Reference',
    summaryTextEn:
      'Comprehensive vocational handbook covering DICOM Multi-Planar Reconstruction (MPR), Hounsfield Unit (HU) thresholding (+350 to +2450 HU), 6-connected seed Region Growing for TMJ condyle separation, dental amalgam beam-hardening scatter cleanup, and watertight STL/OBJ/STEP export for 3D printing.',
    summaryTextId:
      'Buku panduan vokasi komprehensif yang mencakup Rekonstruksi Multi-Planar (MPR) DICOM, ambang batas Unit Hounsfield (+350 hingga +2450 HU), Region Growing 6-konektivitas untuk pemisahan kondilus TMJ, pembersihan hamburan tambalan logam gigi, serta ekspor STL/OBJ/STEP untuk cetak 3D.',
    fullTextContent: `KARINA 3D LAB VOCATIONAL REFERENCE MANUAL (ENGLISH & BAHASA INDONESIA)
1. OVERVIEW & PURPOSE:
This document provides standard operating procedures for vocational biomedical students and medical-device technicians performing Computed Tomography (CT) segmentation, dental scatter artifact cleanup, and 3D skeletal modeling of the human skull and Temporomandibular Joint (TMJ).

2. HOUNSFIELD UNIT (HU) RADIODENSITY CALIBRATION:
- Air: -1000 HU
- Soft Tissue & Articular Disc: -100 to +120 HU
- Trabecular (Cancellous) Bone: +150 to +400 HU
- Cortical Craniofacial Bone: +350 to +2450 HU
- Dental Enamel: +2000 to +2550 HU
- Metallic Dental Amalgam / Implants & Beam-Hardening Scatter Streaks: +2600 to +3200+ HU

3. SEPARATING THE MANDIBULAR CONDYLE FROM THE GLENOID FOSSA:
Because the synovial TMJ space is only 1.5 to 3.0 mm wide, partial volume averaging at low thresholds (<250 HU) can create false bony bridges (pseudo-ankylosis) connecting the mandibular condyle to the temporal glenoid fossa. Technicians must:
(a) Calibrate Min HU to +350..+420 HU.
(b) Place a 6-connected Region Growing seed point directly inside the mandibular condyle head on the Sagittal or Coronal slice.
(c) Run Island Removal to eliminate floating noise clusters smaller than 55 voxels.

4. CLEANING DENTAL METAL SCATTER ARTIFACTS:
Metallic dental fillings cause star-like photon-starvation and beam-hardening streaks across Axial slices Z=18..24. Use the 2D Brush Eraser or Polygon Lasso slice-by-slice to trim radial scatter rays before running Marching Cubes surface extraction, followed by Optical Blue-Laser Surface Scanner registration (0.02 mm crown accuracy) if surgical splints are fabricated.

5. HIGH-REALISM 3D VOLUME SHADING & STL/OBJ/STEP EXPORT:
Apply Taubin volume-preserving mesh smoothing (λ = +0.50, μ = -0.53) so the mandibular condyle does not shrink, verify Inferior Alveolar Nerve canal clearance, confirm Dice Similarity Score >= 85% against the expert reference mesh, and export watertight Binary .STL, Wavefront .OBJ, or ISO 10303-21 .STEP files at 0.5–1.0 mm calibration accuracy.`,
    initialOverviewEn: `1. EXECUTIVE OVERVIEW (Ringkasan Eksekutif):
• Core vocational reference manual for Karina 3D Lab covering CT Multi-Planar Reconstruction (MPR), Hounsfield Unit thresholding, dental scatter artifact cleanup, and 3D TMJ anatomical modeling.
• Designed for Indonesian & English medical-device technicians preparing watertight 3D meshes (.STL, .OBJ, .STEP) from craniomaxillofacial CT scans.

2. KEY ANATOMICAL & TECHNICAL FINDINGS (Temuan Anatomi & Teknis Utama):
• Cortical Bone Thresholding: Optimal segmentation window is +350 to +2450 HU, preventing soft-tissue bleed while excluding extreme metal cores (>2600 HU).
• TMJ Joint Space Preservation: Maintains the 1.5–3.0 mm radiolucent articular disc gap between the Mandibular Condyle and Temporal Glenoid Fossa using 6-connected seed Region Growing.
• Volume-Preserving Smoothing: Uses Taubin dual-pass smoothing (λ = +0.50, μ = -0.53) with cavity ambient occlusion to produce clinical ivory bone 3D renders without condylar shrinkage.

3. PRACTICAL LAB APPLICATION (Aplikasi Praktis di Karina 3D Lab):
• Step 1–2: Inspect Axial, Coronal, and Sagittal viewports with the 10 cm vertical scale bar and calibrate HU sliders to +380..+2450 HU.
• Step 3–4: Run Condyle Seed Region Grow, sweep radial dental scatter streaks with the 2D Brush/Lasso, and execute Auto-Remove Noise Islands.
• Step 5: Inspect the Inferior Alveolar Nerve pathway, verify Dice Similarity Score >= 85%, and export Binary .STL or ISO-10303 .STEP.

4. QUALITY & SAFETY CHECKLIST (Daftar Periksa Kualitas & Keselamatan):
• Verify millimeter calibration ruler tolerance between ±0.50 mm and ±1.00 mm.
• Strictly for educational training on virtualized/anonymized datasets — never for direct clinical surgical diagnosis.`,
    initialOverviewId: `1. RINGKASAN EKSEKUTIF (Executive Overview):
• Modul referensi utama Karina 3D Lab yang mencakup Rekonstruksi Multi-Planar (MPR) CT, kalibrasi Unit Hounsfield (HU), pembersihan artefak hamburan gigi, dan pemodelan anatomi 3D sendi TMJ.
• Dirancang bagi mahasiswa biomedis dan teknisi alat kesehatan untuk menghasilkan mesh 3D kedap air (.STL, .OBJ, .STEP).

2. TEMUAN ANATOMI & TEKNIS UTAMA (Key Anatomical & Technical Findings):
• Ambang Batas Tulang Kortikal: Rentang optimal +350 hingga +2450 HU untuk memisahkan tulang padat dari jaringan lunak dan inti tambalan logam (>2600 HU).
• Pelestarian Celah Sendi TMJ: Menjaga celah diskus artikularis 1,5–3,0 mm antara Kondilus Mandibula dan Fosa Glenoid dengan algoritma Region Growing 6-konektivitas.
• Penghalusan Tanpa Penyusutan Volume: Menggunakan Taubin smoothing (λ = +0.50, μ = -0.53) dan bayangan rongga (ambient occlusion) untuk visualisasi tulang 3D realistis.

3. APLIKASI PRAKTIS DI KARINA 3D LAB (Practical Lab Application):
• Langkah 1–2: Periksa irisan Aksial, Koronal, dan Sagital dengan skala 10 cm lalu atur slider HU ke +380..+2450 HU.
• Langkah 3–4: Jalankan Region Grow Kondilus, hapus garis hamburan logam dengan Kuas/Laso 2D, dan klik Hapus Pulau Noise Otomatis.
• Langkah 5: Periksa jalur Saraf Alveolaris Inferior, pastikan Skor Akurasi Dice >= 85%, lalu ekspor file .STL atau .STEP.

4. DAFTAR PERIKSA KUALITAS & KESELAMATAN (Quality & Safety Checklist):
• Pastikan toleransi kalibrasi milimeter berada pada rentang ±0,50 mm hingga ±1,00 mm.
• Khusus untuk pelatihan vokasi menggunakan data fantom tervirtualisasi/anonim — bukan untuk diagnosis bedah klinis.`,
  },
];

interface ParsedDriveLink {
  type: 'file' | 'folder';
  id: string;
}

function parseGoogleDriveUrl(rawUrl: string): ParsedDriveLink | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Match /folders/<ID>
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (folderMatch) {
    return { type: 'folder', id: folderMatch[1] };
  }

  // Match /file/d/<ID> or /d/<ID>
  const fileMatch = trimmed.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/);
  if (fileMatch) {
    return { type: 'file', id: fileMatch[1] };
  }

  // Match ?id=<ID> or &id=<ID>
  const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (queryIdMatch) {
    return { type: 'file', id: queryIdMatch[1] };
  }

  // If the user pasted a raw Google Drive file/folder ID directly
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { type: 'file', id: trimmed };
  }

  return null;
}

interface MediaGalleryAndPdfLibraryProps {
  language: Language;
  onNotify: (msg: string) => void;
}

export const MediaGalleryAndPdfLibrary: React.FC<MediaGalleryAndPdfLibraryProps> = ({
  language,
  onNotify,
}) => {
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>(BUILTIN_GALLERY_IMAGES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [lightboxImage, setLightboxImage] = useState<GalleryImageItem | null>(null);

  const [pdfItems, setPdfItems] = useState<PdfLibraryItem[]>(BUILTIN_PDF_LIBRARY);
  const [selectedPdfId, setSelectedPdfId] = useState<string>(BUILTIN_PDF_LIBRARY[0].id);
  const [pdfOverviews, setPdfOverviews] = useState<Record<string, string>>({
    pdf_karina_tmj_handbook:
      language === 'en'
        ? BUILTIN_PDF_LIBRARY[0].initialOverviewEn
        : BUILTIN_PDF_LIBRARY[0].initialOverviewId,
  });
  const [customReviewFocus, setCustomReviewFocus] = useState('');
  const [isReviewingPdf, setIsReviewingPdf] = useState(false);

  // Google Drive integration state
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveConnected, setDriveConnected] = useState<boolean>(
    Boolean(getGoogleDriveAccessToken()),
  );

  const localImageInputRef = useRef<HTMLInputElement | null>(null);
  const localPdfInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPdf = pdfItems.find((p) => p.id === selectedPdfId) || pdfItems[0];

  // Keep built-in handbook overview synced when user toggles language if not custom-regenerated
  useEffect(() => {
    setPdfOverviews((prev) => ({
      ...prev,
      pdf_karina_tmj_handbook:
        language === 'en'
          ? BUILTIN_PDF_LIBRARY[0].initialOverviewEn
          : BUILTIN_PDF_LIBRARY[0].initialOverviewId,
    }));
  }, [language]);

  // Helper to run AI PDF Review & Overview via server-side /api/gemini/pdf-review
  const handleGeneratePdfReview = useCallback(
    async (pdfItem: PdfLibraryItem, focusQueryText?: string) => {
      setIsReviewingPdf(true);
      try {
        const res = await fetch('/api/gemini/pdf-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: language === 'en' ? pdfItem.titleEn : pdfItem.titleId,
            textContent: pdfItem.fullTextContent,
            pdfBase64: pdfItem.pdfBase64,
            language,
            focusQuery: focusQueryText || customReviewFocus || undefined,
          }),
        });
        const data = (await res.json()) as { overview?: string; error?: string };
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to generate PDF review');
        }
        if (data.overview) {
          setPdfOverviews((prev) => ({
            ...prev,
            [pdfItem.id]: data.overview!,
          }));
          onNotify(
            language === 'en'
              ? `Completed PDF review & overview for "${pdfItem.titleEn}".`
              : `Selesai meninjau & merangkum PDF "${pdfItem.titleId}".`,
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'PDF review error';
        onNotify(msg);
      } finally {
        setIsReviewingPdf(false);
      }
    },
    [language, customReviewFocus, onNotify],
  );

  // Ensure Google Drive OAuth token is available or trigger signInWithGoogle popup
  const ensureDriveToken = async (): Promise<string | null> => {
    let token = getGoogleDriveAccessToken();
    if (!token) {
      await signInWithGoogle();
      token = getGoogleDriveAccessToken();
    }
    setDriveConnected(Boolean(token));
    return token;
  };

  // Convert ArrayBuffer to Base64 for PDF inlineData analysis
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...slice);
    }
    return btoa(binary);
  };

  // Import a single Drive file object (Image or PDF) into the Gallery or PDF Library
  const ingestDriveFileMetadata = async (
    fileMeta: {
      id: string;
      name: string;
      mimeType: string;
      thumbnailLink?: string;
      webContentLink?: string;
      description?: string;
    },
    token: string | null,
  ) => {
    const isPdf =
      fileMeta.mimeType === 'application/pdf' ||
      fileMeta.name.toLowerCase().endsWith('.pdf');
    const isImage =
      fileMeta.mimeType.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileMeta.name);

    if (isImage) {
      let imageObjectUrl =
        fileMeta.thumbnailLink?.replace(/=s\d+$/, '=s1200') ||
        `https://drive.google.com/thumbnail?id=${fileMeta.id}&sz=w1200`;

      if (token) {
        try {
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileMeta.id}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (mediaRes.ok) {
            const blob = await mediaRes.blob();
            imageObjectUrl = URL.createObjectURL(blob);
          }
        } catch {
          // Fallback to thumbnail URL if direct blob fetch is restricted
        }
      }

      const newImg: GalleryImageItem = {
        id: `drive_img_${fileMeta.id}`,
        titleEn: fileMeta.name,
        titleId: fileMeta.name,
        category: 'Google Drive Import',
        imageUrl: imageObjectUrl,
        captionEn:
          fileMeta.description ||
          `Imported from Google Drive (${fileMeta.name}) for CT & 3D anatomical visual reference.`,
        captionId:
          fileMeta.description ||
          `Diimpor dari Google Drive (${fileMeta.name}) untuk referensi visual CT & anatomi 3D.`,
        sourceLabel: 'Google Drive Image',
        driveFileId: fileMeta.id,
      };

      setGalleryImages((prev) => {
        const exists = prev.some((item) => item.id === newImg.id);
        return exists ? prev.map((i) => (i.id === newImg.id ? newImg : i)) : [newImg, ...prev];
      });
      return 'image';
    }

    if (isPdf) {
      let pdfBase64: string | undefined;
      let embedUrl = `https://drive.google.com/file/d/${fileMeta.id}/preview`;

      if (token) {
        try {
          const mediaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileMeta.id}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (mediaRes.ok) {
            const buffer = await mediaRes.arrayBuffer();
            if (buffer.byteLength <= 15 * 1024 * 1024) {
              pdfBase64 = arrayBufferToBase64(buffer);
            }
            const blob = new Blob([buffer], { type: 'application/pdf' });
            embedUrl = URL.createObjectURL(blob);
          }
        } catch {
          // Keep Google Drive /preview iframe URL fallback
        }
      }

      const newPdf: PdfLibraryItem = {
        id: `drive_pdf_${fileMeta.id}`,
        titleEn: fileMeta.name,
        titleId: fileMeta.name,
        sourceLabel: 'Google Drive PDF',
        pageCountLabel: 'Google Drive Document',
        driveFileId: fileMeta.id,
        embedUrl,
        pdfBase64,
        summaryTextEn:
          fileMeta.description ||
          `Google Drive PDF reference document (${fileMeta.name}) imported into Karina 3D Lab Library.`,
        summaryTextId:
          fileMeta.description ||
          `Dokumen referensi PDF Google Drive (${fileMeta.name}) diimpor ke Pustaka Karina 3D Lab.`,
        fullTextContent: `Google Drive PDF Document Name: ${fileMeta.name}\nDrive File ID: ${fileMeta.id}\nDescription: ${fileMeta.description || 'Clinical / Technical CT & 3D Modeling Reference Document'}`,
        initialOverviewEn: 'Generating AI PDF Review & Overview...',
        initialOverviewId: 'Menyusun Tinjauan & Ringkasan PDF AI...',
      };

      setPdfItems((prev) => {
        const exists = prev.some((item) => item.id === newPdf.id);
        return exists ? prev.map((p) => (p.id === newPdf.id ? newPdf : p)) : [newPdf, ...prev];
      });
      setSelectedPdfId(newPdf.id);
      await handleGeneratePdfReview(newPdf);
      return 'pdf';
    }

    return null;
  };

  // Handle importing from a pasted Google Drive Link (file or folder)
  const handleImportDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseGoogleDriveUrl(driveLinkInput);
    if (!parsed) {
      onNotify(
        language === 'en'
          ? 'Please paste a valid Google Drive file or folder link.'
          : 'Silakan tempel tautan file atau folder Google Drive yang valid.',
      );
      return;
    }

    setIsLoadingDrive(true);
    try {
      const token = getGoogleDriveAccessToken();

      if (parsed.type === 'folder') {
        const activeToken = token || (await ensureDriveToken());
        if (!activeToken) {
          throw new Error(
            language === 'en'
              ? 'Please connect Google Drive to list files inside a shared folder link.'
              : 'Silakan hubungkan Google Drive untuk memuat daftar file di dalam tautan folder.',
          );
        }
        const q = encodeURIComponent(
          `'${parsed.id}' in parents and trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')`,
        );
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,description)&pageSize=24`,
          { headers: { Authorization: `Bearer ${activeToken}` } },
        );
        if (!listRes.ok) {
          throw new Error('Could not read Google Drive folder. Check permissions.');
        }
        const data = (await listRes.json()) as {
          files?: Array<{
            id: string;
            name: string;
            mimeType: string;
            thumbnailLink?: string;
            webContentLink?: string;
            description?: string;
          }>;
        };
        const files = data.files || [];
        let imgCount = 0;
        let pdfCount = 0;
        for (const f of files) {
          const kind = await ingestDriveFileMetadata(f, activeToken);
          if (kind === 'image') imgCount++;
          if (kind === 'pdf') pdfCount++;
        }
        setDriveLinkInput('');
        onNotify(
          language === 'en'
            ? `Imported ${imgCount} image(s) into Gallery and ${pdfCount} PDF(s) into Library from Google Drive folder.`
            : `Mengimpor ${imgCount} gambar ke Galeri dan ${pdfCount} PDF ke Pustaka dari folder Google Drive.`,
        );
      } else {
        // Single file link
        let handled = false;
        const activeToken = token || (await ensureDriveToken().catch(() => null));
        if (activeToken) {
          const metaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${parsed.id}?fields=id,name,mimeType,thumbnailLink,webContentLink,description`,
            { headers: { Authorization: `Bearer ${activeToken}` } },
          );
          if (metaRes.ok) {
            const meta = (await metaRes.json()) as {
              id: string;
              name: string;
              mimeType: string;
              thumbnailLink?: string;
              webContentLink?: string;
              description?: string;
            };
            // Check if this ID is actually a folder
            if (meta.mimeType === 'application/vnd.google-apps.folder') {
              const q = encodeURIComponent(
                `'${parsed.id}' in parents and trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')`,
              );
              const listRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,description)&pageSize=24`,
                { headers: { Authorization: `Bearer ${activeToken}` } },
              );
              if (listRes.ok) {
                const folderData = await listRes.json();
                for (const f of folderData.files || []) {
                  await ingestDriveFileMetadata(f, activeToken);
                }
                handled = true;
              }
            } else {
              await ingestDriveFileMetadata(meta, activeToken);
              handled = true;
            }
          }
        }

        if (!handled) {
          // Public/shared link fallback if user didn't complete OAuth popup
          const lowerUrl = driveLinkInput.toLowerCase();
          const looksLikeImage = /\.(jpg|jpeg|png|webp|gif)/i.test(lowerUrl);
          if (looksLikeImage) {
            await ingestDriveFileMetadata(
              {
                id: parsed.id,
                name: `Google Drive Image (${parsed.id.slice(0, 8)})`,
                mimeType: 'image/jpeg',
              },
              null,
            );
          } else {
            // Add both a previewable PDF entry and a thumbnail check
            await ingestDriveFileMetadata(
              {
                id: parsed.id,
                name: `Google Drive PDF Document (${parsed.id.slice(0, 8)}).pdf`,
                mimeType: 'application/pdf',
              },
              null,
            );
          }
        }

        setDriveLinkInput('');
        onNotify(
          language === 'en'
            ? 'Google Drive link added to Gallery / PDF Reference Library!'
            : 'Tautan Google Drive berhasil ditambahkan ke Galeri / Pustaka PDF!',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Google Drive link.';
      onNotify(msg);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Browse user's recent images and PDFs from Google Drive API v3
  const handleSyncFromGoogleDrive = async () => {
    setIsLoadingDrive(true);
    try {
      const token = await ensureDriveToken();
      if (!token) {
        throw new Error(
          language === 'en'
            ? 'Google Drive sign-in is required to sync files.'
            : 'Masuk ke Google Drive diperlukan untuk menyinkronkan file.',
        );
      }

      const q = encodeURIComponent(
        `trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')`,
      );
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=16&orderBy=modifiedTime desc&fields=files(id,name,mimeType,thumbnailLink,webContentLink,description)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        throw new Error('Failed to fetch files from Google Drive API.');
      }

      const data = (await res.json()) as {
        files?: Array<{
          id: string;
          name: string;
          mimeType: string;
          thumbnailLink?: string;
          webContentLink?: string;
          description?: string;
        }>;
      };

      const files = data.files || [];
      let imgAdded = 0;
      let pdfAdded = 0;

      for (const f of files) {
        const result = await ingestDriveFileMetadata(f, token);
        if (result === 'image') imgAdded++;
        if (result === 'pdf') pdfAdded++;
      }

      onNotify(
        language === 'en'
          ? `Synced ${imgAdded} image(s) to Gallery and ${pdfAdded} PDF(s) to Reference Library from your Google Drive.`
          : `Menyinkronkan ${imgAdded} gambar ke Galeri dan ${pdfAdded} PDF ke Pustaka Referensi dari Google Drive Anda.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Drive sync error.';
      onNotify(msg);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Local Image upload into Gallery
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const added: GalleryImageItem[] = [];
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      added.push({
        id: `local_img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        titleEn: file.name,
        titleId: file.name,
        category: 'Google Drive Import',
        imageUrl: url,
        captionEn: `Uploaded reference image (${file.name}) for 3D craniomaxillofacial modeling comparison.`,
        captionId: `Gambar referensi yang diunggah (${file.name}) untuk perbandingan pemodelan 3D kraniomaksilofasial.`,
        sourceLabel: 'Uploaded Image',
      });
    });

    setGalleryImages((prev) => [...added, ...prev]);
    onNotify(
      language === 'en'
        ? `Added ${added.length} image(s) to the Clinical Visual Gallery.`
        : `Menambahkan ${added.length} gambar ke Galeri Visual Klinis.`,
    );
  };

  // Local PDF upload into PDF Library + automatic AI PDF Review & Overview
  const handleLocalPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const pdfBase64 =
        buffer.byteLength <= 15 * 1024 * 1024 ? arrayBufferToBase64(buffer) : undefined;
      const embedUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));

      const newPdf: PdfLibraryItem = {
        id: `local_pdf_${Date.now()}`,
        titleEn: file.name,
        titleId: file.name,
        sourceLabel: 'Uploaded PDF',
        pageCountLabel: `${(file.size / 1024).toFixed(0)} KB · PDF Document`,
        embedUrl,
        pdfBase64,
        summaryTextEn: `Uploaded PDF document (${file.name}) for AI review and clinical overview.`,
        summaryTextId: `Dokumen PDF yang diunggah (${file.name}) untuk tinjauan AI dan ringkasan klinis.`,
        fullTextContent: `Uploaded PDF File: ${file.name} (${file.size} bytes)`,
        initialOverviewEn: 'Analyzing PDF and generating structured review & overview...',
        initialOverviewId: 'Menganalisis PDF dan menyusun tinjauan & ringkasan terstruktur...',
      };

      setPdfItems((prev) => [newPdf, ...prev]);
      setSelectedPdfId(newPdf.id);
      await handleGeneratePdfReview(newPdf);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not read PDF file.';
      onNotify(msg);
    }
  };

  const galleryCategories = [
    'ALL',
    '3D Volume Render',
    'Clinical CT / MPR',
    'Google Drive Import',
    'PACS Reference',
  ];

  const filteredGallery = galleryImages.filter(
    (img) => selectedCategory === 'ALL' || img.category === selectedCategory,
  );

  return (
    <div className="space-y-8">
      {/* Top Google Drive Connector & Link Importer Bar */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
              <FolderOpen className="w-4 h-4" />
              <span>GOOGLE DRIVE CLINICAL GALLERY & PDF REFERENCE LIBRARY</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {language === 'en'
                ? 'Import Google Drive Images & PDF Library with AI Review & Overview'
                : 'Impor Galeri Gambar & Pustaka PDF Google Drive dengan Tinjauan AI'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'en'
                ? 'Paste any Google Drive folder/file link, sync directly from your Google Drive, or upload local images and PDFs to view them in the gallery and generate a structured bilingual PDF review and overview.'
                : 'Tempel tautan folder/file Google Drive, sinkronkan langsung dari Google Drive Anda, atau unggah gambar dan PDF lokal untuk menampilkannya di galeri serta membuat tinjauan dan ringkasan PDF otomatis.'}
            </p>
          </div>

          {/* Official Google Workspace / Google Drive Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncFromGoogleDrive}
              disabled={isLoadingDrive}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white text-[#1f1f1f] border border-[#747775] hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {isLoadingDrive
                  ? language === 'en'
                    ? 'Syncing Google Drive...'
                    : 'Menyinkronkan Google Drive...'
                  : driveConnected
                    ? language === 'en'
                      ? 'Sync Images & PDFs from Google Drive'
                      : 'Sinkronkan Gambar & PDF dari Google Drive'
                    : language === 'en'
                      ? 'Connect & Load from Google Drive'
                      : 'Hubungkan & Muat dari Google Drive'}
              </span>
            </button>

            <input
              ref={localImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleLocalImageUpload}
              className="hidden"
            />
            <button
              onClick={() => localImageInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-[#0088AA] dark:text-[#00E5FF]" />
              <span>{language === 'en' ? 'Add Images' : 'Tambah Gambar'}</span>
            </button>

            <input
              ref={localPdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleLocalPdfUpload}
              className="hidden"
            />
            <button
              onClick={() => localPdfInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#FFD700] text-xs font-medium text-slate-800 dark:text-[#FFD700] transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>{language === 'en' ? 'Upload PDF for Review' : 'Unggah PDF untuk Ditinjau'}</span>
            </button>
          </div>
        </div>

        {/* Google Drive Link Input Form */}
        <form onSubmit={handleImportDriveLink} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={driveLinkInput}
              onChange={(e) => setDriveLinkInput(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Paste your Google Drive folder, image, or PDF link here (e.g., https://drive.google.com/drive/folders/... or /file/d/...)'
                  : 'Tempel tautan folder, gambar, atau PDF Google Drive Anda di sini (mis. https://drive.google.com/drive/folders/...)'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingDrive || !driveLinkInput.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            {isLoadingDrive
              ? language === 'en'
                ? 'Importing...'
                : 'Mengimpor...'
              : language === 'en'
                ? 'Load Google Drive Link'
                : 'Muat Tautan Google Drive'}
          </button>
        </form>
      </div>

      {/* SECTION 1: Clinical CT & 3D Reference Image Gallery */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-[#0088AA] dark:text-[#00E5FF]" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Clinical CT, MPR & 3D Visual Reference Gallery'
                  : 'Galeri Referensi Visual CT, MPR & 3D Klinis'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? `Showing ${filteredGallery.length} high-resolution clinical reference & Google Drive images. Click any image to inspect full-screen.`
                  : `Menampilkan ${filteredGallery.length} gambar referensi klinis & Google Drive resolusi tinggi. Klik gambar untuk memperbesar.`}
              </p>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {galleryCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#00E5FF] text-[#0A192F] font-semibold'
                    : 'bg-slate-100 dark:bg-[#0A192F] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredGallery.map((img) => (
            <div
              key={img.id}
              onClick={() => setLightboxImage(img)}
              className="group bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 hover:border-[#00E5FF] rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all"
            >
              <div className="aspect-[16/10] bg-black relative overflow-hidden">
                <img
                  src={img.imageUrl}
                  alt={language === 'en' ? img.titleEn : img.titleId}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-[#0A192F]/85 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-[#00E5FF]">
                  {img.category}
                </div>
                <div className="absolute bottom-2 right-2 bg-[#0A192F]/85 p-1.5 rounded-lg text-white opacity-80 group-hover:opacity-100">
                  <Eye className="w-3.5 h-3.5 text-[#00E5FF]" />
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-[#FFD700]">{img.sourceLabel}</span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                    {language === 'en' ? img.titleEn : img.titleId}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {language === 'en' ? img.captionEn : img.captionId}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#0088AA] dark:text-[#00E5FF] group-hover:underline">
                  {language === 'en' ? 'Inspect Image →' : 'Perbesar Gambar →'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PDF Reference Library & AI PDF Review / Overview */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#FFD700]" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'PDF Reference Library & Structured PDF Review / Overview'
                  : 'Pustaka Referensi PDF & Tinjauan / Ringkasan PDF Terstruktur'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'en'
                  ? 'Select a PDF from the library (or import from Google Drive) to read the document and review its executive overview, anatomical findings, and lab checklist.'
                  : 'Pilih PDF dari pustaka (atau impor dari Google Drive) untuk membaca dokumen serta meninjau ringkasan eksekutif, temuan anatomi, dan daftar periksa lab.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleGeneratePdfReview(selectedPdf)}
            disabled={isReviewingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD700] text-[#0A192F] font-semibold text-xs hover:bg-amber-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            {isReviewingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isReviewingPdf
                ? language === 'en'
                  ? 'Reviewing PDF...'
                  : 'Meninjau PDF...'
                : language === 'en'
                  ? 'Generate AI Review & Overview'
                  : 'Buat Tinjauan & Ringkasan PDF'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Columns: PDF Library List & Document Viewer Preview */}
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
              {language === 'en'
                ? `AVAILABLE LIBRARY DOCUMENTS (${pdfItems.length})`
                : `DOKUMEN PUSTAKA TERSEDIA (${pdfItems.length})`}
            </p>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {pdfItems.map((pdf) => {
                const isSelected = pdf.id === selectedPdf.id;
                return (
                  <div
                    key={pdf.id}
                    onClick={() => setSelectedPdfId(pdf.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-[#00E5FF]/12 border-[#00E5FF]'
                        : 'bg-slate-50 dark:bg-[#0A192F] border-slate-200 dark:border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-[#FFD700] font-semibold">
                        {pdf.sourceLabel}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {pdf.pageCountLabel}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {language === 'en' ? pdf.titleEn : pdf.titleId}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                      {language === 'en' ? pdf.summaryTextEn : pdf.summaryTextId}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Embedded PDF Document Reader / Source Preview */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF] font-semibold">
                  {language === 'en' ? 'PDF DOCUMENT READER' : 'PEMBACA DOKUMEN PDF'}
                </span>
                {selectedPdf.driveFileId && (
                  <a
                    href={`https://drive.google.com/file/d/${selectedPdf.driveFileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-[#FFD700] hover:underline"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {selectedPdf.embedUrl ? (
                <iframe
                  src={selectedPdf.embedUrl}
                  title={selectedPdf.titleEn}
                  className="w-full h-72 rounded-lg border border-slate-700 bg-black"
                />
              ) : (
                <div className="h-64 overflow-y-auto p-3.5 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedPdf.fullTextContent}
                </div>
              )}
            </div>
          </div>

          {/* Right 7 Columns: Structured AI PDF Review & Executive Overview */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-[#FFD700] font-semibold">
                  KARINA 3D LAB // PDF REVIEW & OVERVIEW
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? selectedPdf.titleEn : selectedPdf.titleId}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-[#00E5FF]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Reviewed' : 'Telah Ditinjau'}</span>
              </span>
            </div>

            {/* Structured Overview Output */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 text-xs md:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line leading-relaxed max-h-[380px] overflow-y-auto">
              {pdfOverviews[selectedPdf.id] ||
                (language === 'en'
                  ? selectedPdf.initialOverviewEn
                  : selectedPdf.initialOverviewId)}
            </div>

            {/* Custom Question / Focus Prompt against this PDF */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGeneratePdfReview(selectedPdf, customReviewFocus);
              }}
              className="flex flex-col sm:flex-row gap-2 pt-1"
            >
              <input
                type="text"
                value={customReviewFocus}
                onChange={(e) => setCustomReviewFocus(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'Ask for a specific review focus on this PDF (e.g., Summarize TMJ HU thresholds & 3D rendering steps)...'
                    : 'Minta fokus tinjauan khusus pada PDF ini (mis. Rangkum ambang batas HU TMJ & langkah rendering 3D)...'
                }
                className="flex-1 px-3.5 py-2 rounded-lg bg-white dark:bg-[#112240] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF]"
              />
              <button
                type="submit"
                disabled={isReviewingPdf}
                className="px-4 py-2 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                {language === 'en' ? 'Update Review' : 'Perbarui Tinjauan'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-white dark:bg-[#112240] border border-[#00E5FF]/50 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-[#00E5FF]">
                  {lightboxImage.category} · {lightboxImage.sourceLabel}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? lightboxImage.titleEn : lightboxImage.titleId}
                </h3>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#0A192F] text-slate-700 dark:text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black rounded-xl overflow-hidden max-h-[65vh] flex items-center justify-center">
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.titleEn}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'en' ? lightboxImage.captionEn : lightboxImage.captionId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
