export type VideoCategoryId = 'all' | 'biomechanics' | 'dental_ct' | 'implant_cad';

export interface LibraryVideoItem {
  id: string;
  driveFileId: string;
  src: string;
  poster: string;
  category: Exclude<VideoCategoryId, 'all'>;
  durationLabel: string;
  isNew?: boolean;
  titleEn: string;
  titleId: string;
  subtitleEn: string;
  subtitleId: string;
  badgeEn: string;
  badgeId: string;
  tags: string[];
}

export const LANDING_DRIVE_FOLDER_ID = '1x477U38x7QqfqE7cB9CW8WQPYxejd0f2';

export const BUILTIN_VIDEO_LIBRARY: LibraryVideoItem[] = [
  {
    id: 'promo_5',
    driveFileId: '11MN03aGLJE_7lJXcyit310e3DAbsXKzG',
    src: '/assets/promo/karina_promo_5.mp4',
    poster: '/assets/promo/karina_promo_5_poster.jpg',
    category: 'biomechanics',
    durationLabel: '8:42 · NARRATED',
    isNew: true,
    titleEn: 'Engineering the Bionic TMJ: From TPMS Gyroids to Voxelized Cartilage',
    titleId: 'Rekayasa TMJ Bionik: Dari TPMS Gyroid hingga Tulang Rawan Voxel',
    subtitleEn:
      'In-depth narrated exploration of alloplastic TMJ replacement kinematics, sagittal rotation vs. anterior translation, Triply Periodic Minimal Surface (TPMS) gyroid lattices, and voxelized artificial cartilage engineering.',
    subtitleId:
      'Eksplorasi bernarasi mendalam mengenai kinematika penggantian TMJ aloplastik, rotasi sagital vs. translasi anterior, kisi gyroid TPMS, serta rekayasa tulang rawan buatan berbasis voxel.',
    badgeEn: 'NEW LIBRARY FEATURE · 8:42',
    badgeId: 'VIDEO BARU · 8:42',
    tags: ['TMJ', 'TPMS Gyroid', 'Biomechanics', 'Cartilage', 'Kinematics'],
  },
  {
    id: 'promo_6',
    driveFileId: '1GMqjWF1bFpMS2o1UbEbPA21YGttN44yy',
    src: '/assets/promo/karina_promo_6.mp4',
    poster: '/assets/promo/karina_promo_6_poster.jpg',
    category: 'biomechanics',
    durationLabel: '4:28 · NARRATED',
    isNew: true,
    titleEn: 'The Gradient Blueprint: 3D Bioprinting the TMJ',
    titleId: 'Cetak Biru Gradien: Bioprinting 3D untuk Sendi TMJ',
    subtitleEn:
      'Narrated guide to multi-material gradient 3D bioprinting for temporomandibular joint reconstruction—bridging rigid osseous fixation, occlusal dental loading, and smooth viscoelastic disc interfaces.',
    subtitleId:
      'Panduan bernarasi mengenai bioprinting 3D gradien multi-material untuk rekonstruksi sendi temporomandibular—menghubungkan fiksasi tulang kaku, beban oklusal gigi, dan antarmuka diskus elastis.',
    badgeEn: 'NEW LIBRARY FEATURE · 4:28',
    badgeId: 'VIDEO BARU · 4:28',
    tags: ['Bioprinting', 'Gradient', 'TMJ', 'Occlusion', 'FGM'],
  },
  {
    id: 'promo_4',
    driveFileId: '1uTXw4zfNjcEdfVKtqM_y6MO06k206tQA',
    src: '/assets/promo/karina_promo_4.mp4',
    poster: '/assets/promo/karina_promo_4_poster.jpg',
    category: 'biomechanics',
    durationLabel: '5:58 · NARRATED',
    titleEn: 'The Blueprint to Biomechanics (K3D & FGM TMJ Implants)',
    titleId: 'The Blueprint to Biomechanics (K3D & Implan TMJ FGM)',
    subtitleEn:
      'Full narrated deep-dive covering TMJ condylar translation, Karina 3D Lab bilingual CT segmentation & nerve safety, and Functionally Graded Material (FGM 90–0) implants delivering 9.2× lower peak interface stress and +88% mobility.',
    subtitleId:
      'Presentasi bernarasi lengkap mengenai translasi kondilus TMJ, segmentasi CT bilingual Karina 3D Lab & keamanan saraf, serta implan FGM 90–0 dengan penurunan tegangan antarmuka 9,2× dan mobilitas +88%.',
    badgeEn: 'FEATURE DOCUMENTARY · 5:58',
    badgeId: 'DOKUMENTER UTAMA · 5:58',
    tags: ['K3D', 'FGM 90-0', 'Biomechanics', 'Stress Analysis'],
  },
  {
    id: 'promo_3',
    driveFileId: '1JUylv9SkEq3t7JXv6N0881YteHUT5EgE',
    src: '/assets/promo/karina_promo_3.mp4',
    poster: '/src/assets/images/hero_karina_craniotmj_promo_1795440953726.jpg',
    category: 'dental_ct',
    durationLabel: '0:08 · DEMO REEL',
    titleEn: 'Full Skull Bite Alignment & Virtual Tooth Replacement',
    titleId: 'Penyelarasan Gigitan Tengkorak & Penggantian Gigi Virtual',
    subtitleEn:
      'DICOM import, translucent cranial bone revealing tooth roots and mandibular nerve, anatomical odontogram, and placing a realistic virtual replacement tooth over metallic crown scatter.',
    subtitleId:
      'Impor DICOM, tulang transparan menampilkan akar gigi dan saraf mandibula, odontogram anatomis, serta penempatan gigi pengganti virtual pada area hamburan mahkota logam.',
    badgeEn: 'DEMO REEL · DENTAL & CT',
    badgeId: 'REEL DEMO · GIGI & CT',
    tags: ['Odontogram', 'Bite Alignment', 'Virtual Tooth', 'Scatter Cleanup'],
  },
  {
    id: 'promo_1',
    driveFileId: '1mVtwtrshdH1uMPSOSwph4CuqKpcrZuaW',
    src: '/assets/promo/karina_promo_1.mp4',
    poster: '/src/assets/images/diagram_tmj_condyle_anatomy_1795440952547.jpg',
    category: 'implant_cad',
    durationLabel: '0:08 · DEMO REEL',
    titleEn: 'Dental Scatter Cleanup, Nerve Canal & TMJ Prosthesis',
    titleId: 'Pembersihan Hamburan Gigi, Kanalis Saraf & Prostesis TMJ',
    subtitleEn:
      'Isolating cortical bone, trimming metallic dental filling scatter streaks, inspecting the golden mandibular nerve, and fitting a custom Ti-6Al-4V TMJ ramus prosthesis.',
    subtitleId:
      'Isolasi tulang kortikal, pemangkasan hamburan tambalan logam, inspeksi saraf mandibula, dan pemasangan prostesis pelat ramus TMJ titanium.',
    badgeEn: 'DEMO REEL · IMPLANT CAD',
    badgeId: 'REEL DEMO · CAD IMPLAN',
    tags: ['TMJ Prosthesis', 'Nerve Canal', 'Scatter Cleanup', 'Titanium'],
  },
  {
    id: 'promo_2',
    driveFileId: '1PuIWFN_NLULssFufHe_26GGd99QuU575',
    src: '/assets/promo/karina_promo_2.mp4',
    poster: '/src/assets/images/diagram_3d_printing_laser_scan_1795440953581.jpg',
    category: 'dental_ct',
    durationLabel: '0:08 · DEMO REEL',
    titleEn: 'DICOM Series Importer & Isolated Mandible Odontogram',
    titleId: 'Impor Seri DICOM & Odontogram Mandibula Terisolasi',
    subtitleEn:
      'Loading multi-slice DICOM CT series into a smooth isolated mandibular 3D render with interactive odontogram selection and nerve pathway controls.',
    subtitleId:
      'Memuat seri CT DICOM multi-irisan menjadi render 3D mandibula halus dengan pemilihan odontogram interaktif dan kontrol jalur saraf.',
    badgeEn: 'DEMO REEL · DICOM',
    badgeId: 'REEL DEMO · DICOM',
    tags: ['DICOM', 'Mandible', '3D Render', 'Odontogram'],
  },
];
