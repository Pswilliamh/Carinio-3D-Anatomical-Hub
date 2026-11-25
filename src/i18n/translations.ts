export type Language = 'en' | 'id';

export interface GlossaryItem {
  id: string;
  termEn: string;
  termId: string;
  category: 'CT Physics' | '3D Modeling' | '3D Printing & Scanners' | 'TMJ Anatomy';
  definitionEn: string;
  definitionId: string;
  clinicalRange?: string;
}

export const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    id: 'hu',
    termEn: 'Hounsfield Unit (HU)',
    termId: 'Unit Hounsfield (HU)',
    category: 'CT Physics',
    definitionEn:
      'A quantitative radiodensity scale used in Computed Tomography where water is 0 HU, air is -1000 HU, trabecular/spongy bone is +150 to +400 HU, dense cortical bone is +400 to +1900 HU, tooth enamel is +2000 to +2500 HU, and metallic implants/fillings exceed +2600 HU.',
    definitionId:
      'Skala radiodensitas kuantitatif pada Computed Tomography di mana air adalah 0 HU, udara -1000 HU, tulang trabekular +150 hingga +400 HU, tulang kortikal padat +400 hingga +1900 HU, email gigi +2000 hingga +2500 HU, dan tambalan/implan logam melebihi +2600 HU.',
    clinicalRange: '-1000 HU to +3200 HU',
  },
  {
    id: 'beam_hardening',
    termEn: 'Beam-Hardening & Metallic Scatter Artifact',
    termId: 'Artefak Pengerasan Berkas & Hamburan Logam',
    category: 'CT Physics',
    definitionEn:
      'Bright and dark star-like streaks on CT slices caused by dense dental amalgam fillings or titanium implants absorbing low-energy X-ray photons. These streaks must be trimmed slice-by-slice using a 2D/3D lasso or brush eraser before generating an STL file.',
    definitionId:
      'Garis pancaran terang dan gelap menyerupai bintang pada irisan CT akibat tambalan gigi amalgam atau implan titanium yang menyerap foton sinar-X energi rendah. Hamburan ini harus dibersihkan per irisan dengan penghapus kuas/laso sebelum membuat file STL.',
    clinicalRange: '+2500 HU to +3200 HU',
  },
  {
    id: 'marching_cubes',
    termEn: 'Marching Cubes Isosurface Extraction',
    termId: 'Ekstraksi Permukaan Marching Cubes',
    category: '3D Modeling',
    definitionEn:
      'A computer graphics algorithm that traverses a 3D voxel segmentation mask and constructs a watertight polygonal triangle mesh at the boundary between segmented bone voxels and surrounding tissue.',
    definitionId:
      'Algoritma grafika komputer yang menelusuri mask segmentasi voksel 3D dan membentuk jaring segitiga poligonal kedap air pada batas antara voksel tulang yang tersegmentasi dan jaringan sekitarnya.',
  },
  {
    id: 'region_growing',
    termEn: 'Region Growing (6-Connected Flood Fill)',
    termId: 'Region Growing (Konektivitas Titik Benih)',
    category: '3D Modeling',
    definitionEn:
      'An anatomical separation technique starting from a user-placed seed voxel (e.g., inside the mandibular condyle) that collects only physically connected bone voxels, separating the mobile mandible from the cranial temporal bone across the TMJ synovial space.',
    definitionId:
      'Teknik pemisahan anatomi yang dimulai dari voksel benih (misalnya di dalam kondilus mandibula) untuk mengumpulkan voksel tulang yang terhubung secara fisik, memisahkan mandibula dari tulang temporal kranial melintasi celah sendi TMJ.',
  },
  {
    id: 'tmj_condyle',
    termEn: 'Mandibular Condyle & Glenoid Fossa',
    termId: 'Kondilus Mandibula & Fosa Glenoid',
    category: 'TMJ Anatomy',
    definitionEn:
      'The rounded superior head of the mandible (condyle) that articulates with the mandibular (glenoid) fossa of the temporal bone. Maintaining the 1.5–3.0 mm radiolucent articular disc space during segmentation prevents false bony ankylosis bridges in 3D prints.',
    definitionId:
      'Kepala superior mandibula yang membulat (kondilus) dan berartikulasi dengan fosa glenoid tulang temporal. Menjaga celah diskus artikularis 1,5–3,0 mm saat segmentasi mencegah jembatan fusi palsu pada hasil cetak 3D.',
    clinicalRange: 'Joint Space: 1.5 – 3.0 mm',
  },
  {
    id: 'inferior_alveolar_nerve',
    termEn: 'Inferior Alveolar (Mandibular) Nerve Canal',
    termId: 'Kanalis Saraf Alveolaris Inferior (Mandibula)',
    category: 'TMJ Anatomy',
    definitionEn:
      'An internal bony canal running from the mandibular foramen (near the lingula) through the ramus and body of the mandible to the mental foramen. Mapping this pathway in 3D is vital before drilling screw fixation holes for titanium TMJ prostheses.',
    definitionId:
      'Kanal tulang internal yang membentang dari foramen mandibula melalui ramus dan korpus mandibula menuju foramen mentale. Pemetaan jalur saraf ini dalam 3D sangat penting sebelum merencanakan posisi sekrup implan prostetik titanium.',
  },
  {
    id: 'stl_obj_step',
    termEn: 'STL, OBJ & STEP (ISO 10303) File Formats',
    termId: 'Format File CAD/CAM STL, OBJ & STEP',
    category: '3D Printing & Scanners',
    definitionEn:
      'STL (Stereolithography) stores raw surface triangles for 3D printing slicers; OBJ stores vertices, normals, and material groups; STEP (ISO 10303-21) is the precision CAD solid/surface exchange standard used for CNC machining custom titanium TMJ implants.',
    definitionId:
      'STL menyimpan permukaan segitiga untuk perangkat lunak slicer 3D printer; OBJ menyimpan verteks, normal, dan grup material; STEP (ISO 10303-21) adalah standar pertukaran CAD presisi untuk pemesinan CNC implan TMJ titanium.',
  },
  {
    id: 'sla_dlp_laser',
    termEn: 'SLA/DLP/SLS 3D Printers & Optical Laser Scanners',
    termId: 'Printer 3D SLA/DLP/SLS & Pemindai Laser Optik',
    category: '3D Printing & Scanners',
    definitionEn:
      'Stereolithography (SLA) and Digital Light Processing (DLP) cure biocompatible photopolymer resin at 0.025–0.1 mm layer thickness for surgical guides and anatomical models, while Direct Metal Laser Sintering (DMLS/SLM) fuses Ti-6Al-4V titanium powder. Optical blue-laser surface scanners capture dental casts at <0.02 mm accuracy to register intraoral surfaces with CT bone meshes.',
    definitionId:
      'Printer SLA dan DLP mengeraskan resin fotopolimer biokompatibel pada ketebalan lapisan 0,025–0,1 mm untuk model anatomi, sedangkan DMLS/SLM melebur bubuk titanium Ti-6Al-4V. Pemindai permukaan laser optik memindai cetakan gigi dengan akurasi <0,02 mm untuk menyelaraskan permukaan intraoral dengan mesh tulang CT.',
    clinicalRange: 'Calibration Tolerance: 0.5 – 1.0 mm',
  },
];

export const UI_TEXT = {
  en: {
    navOverview: 'Overview & Video',
    navWorkstation: '4-View Workstation',
    navGuidedLab: 'Guided Lab (5 Steps)',
    navGlossaryAi: 'Gallery & PDF Library',
    navAuditDashboard: 'Audit & Telemetry',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign Out',
    welcomeAssistant: 'Welcome to this virtual assistant',
    disclaimerBanner:
      'VOCATIONAL TRAINING PLATFORM ONLY — Uses virtualized & anonymized synthetic CT datasets. Not for real-world clinical diagnosis or surgical planning.',
    acknowledgeBtn: 'I Acknowledge & Enter Karina 3D Lab',
    datasetLabel: 'Volumetric Dataset',
    datasetTmj: 'TMJ Condyle & Fossa (With Dental Metal Scatter)',
    datasetCranium: 'Full Human Cranium & Maxillofacial Arch',
    uploadDicomNifti: 'Import Local .NII / .DCM / .JSON',
    windowPreset: 'Window / Level',
    presetBone: 'Bone (W:2000 L:400)',
    presetSoft: 'Soft Tissue (W:400 L:40)',
    presetMetal: 'Dental / Metal (W:3500 L:1200)',
    huThresholdTitle: 'Hounsfield Unit (HU) Thresholding',
    minHu: 'Min HU',
    maxHu: 'Max HU',
    cleanupToolkitTitle: 'Scatter & Artifact Cleanup Toolkit',
    toolNavigate: 'Crosshair Navigate',
    toolBrushErase: 'Scatter Brush Eraser',
    toolLassoErase: '2D Lasso Trim',
    toolRegionGrow: 'Condyle Seed Region Grow',
    toolCaliper: 'mm Calibration Ruler',
    removeIslandsBtn: 'Auto-Remove Noise Islands',
    autoSeparateCondyleBtn: 'Auto-Isolate Mandible & Condyle',
    detectLandmarksBtn: 'Auto-Detect Landmarks',
    resetVolumeBtn: 'Reset Raw Volume',
    compareRefBtn: 'Compare vs. Expert Reference',
    exportStlBtn: 'Export .STL',
    exportObjBtn: 'Export .OBJ',
    exportStepBtn: 'Export .STEP',
    teethManagerTitle: 'Interactive Maxillofacial & Mandibular Dentition',
    upperTeethLabel: 'Upper Arch (Maxillofacial)',
    lowerTeethLabel: 'Lower Arch (Mandibular)',
    showAllTeeth: 'Show All Teeth',
    hideAllTeeth: 'Hide All Teeth',
    nervePathwayTitle: 'Mandibular Nerve Pathway & Prosthetic Preview',
    nerveOpacityLabel: 'Inferior Alveolar Nerve Opacity',
    meshOpacityLabel: 'Bone Mesh Opacity (TMJ Space)',
    meshSmoothingLabel: 'Laplacian Mesh Smoothing',
    titaniumImplantToggle: 'Titanium TMJ Prosthetic Implant Fit',
    laserScannerToggle: 'Optical Laser Surface Scan Alignment',
    wireframeToggle: 'Wireframe Overlay',
    calibrationPrecisionLabel: 'Calibration Precision Scale',
  },
  id: {
    navOverview: 'Beranda & Video',
    navWorkstation: 'Stasiun Kerja 4-Layar',
    navGuidedLab: 'Lab Terpandu (5 Modul)',
    navGlossaryAi: 'Galeri & Pustaka PDF',
    navAuditDashboard: 'Audit & Telemetri',
    signInGoogle: 'Masuk dengan Google',
    signOut: 'Keluar',
    welcomeAssistant: 'Selamat datang di asisten virtual ini',
    disclaimerBanner:
      'KHUSUS PELATIHAN VOKASI — Menggunakan dataset CT sintetis tervirtualisasi & anonim. Bukan untuk diagnosis klinis atau bedah medis nyata.',
    acknowledgeBtn: 'Saya Mengerti & Masuk ke Karina 3D Lab',
    datasetLabel: 'Dataset Volumetrik',
    datasetTmj: 'Kondilus & Fosa TMJ (Dengan Hamburan Tambalan Logam)',
    datasetCranium: 'Kranium Manusia Lengkap & Lengkung Maksilofasial',
    uploadDicomNifti: 'Impor File .NII / .DCM / .JSON Lokal',
    windowPreset: 'Window / Level',
    presetBone: 'Tulang (W:2000 L:400)',
    presetSoft: 'Jaringan Lunak (W:400 L:40)',
    presetMetal: 'Gigi / Logam (W:3500 L:1200)',
    huThresholdTitle: 'Ambang Batas Unit Hounsfield (HU)',
    minHu: 'HU Minimum',
    maxHu: 'HU Maksimum',
    cleanupToolkitTitle: 'Alat Pembersih Hamburan & Artefak Logam',
    toolNavigate: 'Navigasi Crosshair',
    toolBrushErase: 'Kuas Penghapus Hamburan',
    toolLassoErase: 'Pemotong Laso 2D',
    toolRegionGrow: 'Region Grow Kondilus',
    toolCaliper: 'Penggaris Kalibrasi mm',
    removeIslandsBtn: 'Hapus Pulau Noise Otomatis',
    autoSeparateCondyleBtn: 'Isolasi Mandibula & Kondilus',
    detectLandmarksBtn: 'Deteksi Titik Anatomi Otomatis',
    resetVolumeBtn: 'Reset Volume Awal',
    compareRefBtn: 'Bandingkan dengan Referensi Ahli',
    exportStlBtn: 'Ekspor .STL',
    exportObjBtn: 'Ekspor .OBJ',
    exportStepBtn: 'Ekspor .STEP',
    teethManagerTitle: 'Set Gigi Maksilofasial & Mandibula Interaktif',
    upperTeethLabel: 'Lengkung Atas (Maksilofasial)',
    lowerTeethLabel: 'Lengkung Bawah (Mandibula)',
    showAllTeeth: 'Tampilkan Semua Gigi',
    hideAllTeeth: 'Sembunyikan Semua Gigi',
    nervePathwayTitle: 'Jalur Saraf Mandibula & Pratinjau Prostetik',
    nerveOpacityLabel: 'Opasitas Saraf Alveolaris Inferior',
    meshOpacityLabel: 'Opasitas Mesh Tulang (Celah TMJ)',
    meshSmoothingLabel: 'Penghalusan Mesh Laplacian',
    titaniumImplantToggle: 'Uji Pas Implan Prostetik TMJ Titanium',
    laserScannerToggle: 'Penyelarasan Pemindai Permukaan Laser Optik',
    wireframeToggle: 'Tampilan Rangka Kawat (Wireframe)',
    calibrationPrecisionLabel: 'Skala Presisi Kalibrasi',
  },
};

export interface LabModuleStep {
  id: string;
  number: number;
  titleEn: string;
  titleId: string;
  objectiveEn: string;
  objectiveId: string;
  instructionEn: string;
  instructionId: string;
  badgeEn: string;
  badgeId: string;
}

export const LAB_MODULES: LabModuleStep[] = [
  {
    id: 'mod_1_mpr',
    number: 1,
    titleEn: 'Navigating Skull & TMJ Anatomy in 2D Slices',
    titleId: 'Navigasi Anatomi Tengkorak & TMJ pada Irisan 2D',
    objectiveEn:
      'Explore synchronized Axial, Coronal, and Sagittal MPR slices and run Automated Landmark Detection.',
    objectiveId:
      'Jelajahi irisan MPR Aksial, Koronal, dan Sagital yang tersinkronisasi serta jalankan Deteksi Titik Anatomi Otomatis.',
    instructionEn:
      'Drag the Axial (Z), Coronal (Y), and Sagittal (X) sliders or click inside any 2D viewport to inspect the Mandibular Condyle and Glenoid Fossa. Click "Auto-Detect Landmarks" to identify 5 craniomaxillofacial landmarks.',
    instructionId:
      'Geser slider Aksial (Z), Koronal (Y), dan Sagital (X) atau klik pada tampilan 2D untuk memeriksa Kondilus Mandibula dan Fosa Glenoid. Klik "Deteksi Titik Anatomi Otomatis" untuk menandai 5 titik kraniomaksilofasial.',
    badgeEn: 'MPR Anatomist',
    badgeId: 'Ahli Anatomi MPR',
  },
  {
    id: 'mod_2_hu',
    number: 2,
    titleEn: 'Setting Bone Thresholds (Hounsfield Units)',
    titleId: 'Mengatur Ambang Batas Tulang (Unit Hounsfield)',
    objectiveEn:
      'Isolate cortical and trabecular bone while excluding soft tissue (-100 to +150 HU) and extreme metal cores.',
    objectiveId:
      'Isolasi tulang kortikal dan trabekular sambil mengecualikan jaringan lunak (-100 hingga +150 HU) dan inti logam ekstrem.',
    instructionEn:
      'Adjust the Min HU slider to 320–450 HU and Max HU slider to 2400–2750 HU. Watch the Cyan (#00E5FF) segmentation mask dynamically highlight cortical bone across all 3 planes.',
    instructionId:
      'Atur slider HU Minimum ke 320–450 HU dan HU Maksimum ke 2400–2750 HU. Perhatikan mask segmentasi Cyan (#00E5FF) menyoroti tulang kortikal secara real-time di ketiga bidang.',
    badgeEn: 'Hounsfield Calibrator',
    badgeId: 'Kalibrator Hounsfield',
  },
  {
    id: 'mod_3_region',
    number: 3,
    titleEn: 'Isolating the Mandible & Condyle (Region Growing)',
    titleId: 'Mengisolasi Mandibula & Kondilus (Region Growing)',
    objectiveEn:
      'Use 6-connected Seed-Point Region Growing to separate the lower jaw from the temporal bone glenoid fossa.',
    objectiveId:
      'Gunakan Region Growing berbasis titik benih untuk memisahkan rahang bawah dari fosa glenoid tulang temporal.',
    instructionEn:
      'Select "Condyle Seed Region Grow" (or click "Auto-Isolate Mandible & Condyle") and click directly on the mandibular condyle head in the Sagittal or Coronal slice to separate it from the cranial base.',
    instructionId:
      'Pilih alat "Region Grow Kondilus" (atau klik "Isolasi Mandibula & Kondilus") lalu klik langsung pada kepala kondilus mandibula di irisan Sagital atau Koronal untuk memisahkannya dari basis kranial.',
    badgeEn: 'TMJ Joint Separator',
    badgeId: 'Pemisah Sendi TMJ',
  },
  {
    id: 'mod_4_scatter',
    number: 4,
    titleEn: 'Cleaning Dental Scatter & Artifacts',
    titleId: 'Membersihkan Hamburan Tambalan Gigi & Artefak Logam',
    objectiveEn:
      'Trim dental amalgam/implant beam-hardening streaks and run Island Removal to delete floating noise voxels.',
    objectiveId:
      'Pangkas pancaran pengerasan berkas tambalan gigi dengan kuas/laso dan jalankan Penghapusan Pulau Noise.',
    instructionEn:
      'Activate the "Scatter Brush Eraser" or "2D Lasso Trim" tool and sweep over the bright cyan radial scatter streaks near the dental arch on Axial slice Z=18..24, then click "Auto-Remove Noise Islands".',
    instructionId:
      'Aktifkan "Kuas Penghapus Hamburan" atau "Pemotong Laso 2D" dan sapukan pada garis pancaran hamburan di sekitar lengkung gigi pada irisan Aksial Z=18..24, lalu klik "Hapus Pulau Noise Otomatis".',
    badgeEn: 'Artifact Specialist',
    badgeId: 'Spesialis Pembersih Artefak',
  },
  {
    id: 'mod_5_stl',
    number: 5,
    titleEn: 'Generating & Inspecting a 3D Printable STL Model',
    titleId: 'Membuat & Memeriksa Model 3D Siap Cetak (.STL / .STEP)',
    objectiveEn:
      'Inspect the Marching Cubes 3D mesh, mandibular nerve canal, teeth sets, and export an STL/STEP file.',
    objectiveId:
      'Periksa mesh 3D Marching Cubes, kanalis saraf mandibula, set gigi, dan ekspor file STL/STEP.',
    instructionEn:
      'Enable "Compare vs. Expert Reference" to verify a Dice Similarity Score >= 85%, inspect the golden Mandibular Nerve pathway and individual teeth toggles, then click "Export .STL" for 3D printing practice.',
    instructionId:
      'Aktifkan "Bandingkan dengan Referensi Ahli" untuk mencapai Skor Akurasi Dice >= 85%, periksa jalur Saraf Mandibula berwarna emas dan visibilitas gigi, lalu klik "Ekspor .STL" untuk latihan cetak 3D.',
    badgeEn: 'Certified 3D Biomedical Modeler',
    badgeId: 'Modeler Biomedis 3D Tersertifikasi',
  },
];
