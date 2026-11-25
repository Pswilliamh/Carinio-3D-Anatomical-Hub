import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Lock, FileWarning } from 'lucide-react';
import { Language, UI_TEXT } from '../i18n/translations';

interface SafetyDisclaimerModalProps {
  language: Language;
  onToggleLanguage: () => void;
  onAcknowledge: () => void;
}

export const SafetyDisclaimerModal: React.FC<SafetyDisclaimerModalProps> = ({
  language,
  onToggleLanguage,
  onAcknowledge,
}) => {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const t = UI_TEXT[language];

  const canProceed = checked1 && checked2;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F]/95 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white dark:bg-[#112240] text-slate-900 dark:text-white border border-slate-300 dark:border-[#00E5FF]/40 rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/40">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-mono text-[#00E5FF] tracking-wide">
                MANDATORY CLINICAL SAFETY & TRAINING GATE
              </p>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {language === 'en'
                  ? 'Non-Clinical Educational & Virtualized Data Disclaimer'
                  : 'Pernyataan Penggunaan Pelatihan Vokasi & Data Tervirtualisasi'}
              </h1>
            </div>
          </div>

          <button
            onClick={onToggleLanguage}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:border-[#00E5FF] transition-colors whitespace-nowrap shrink-0"
          >
            {language === 'en' ? 'Bahasa Indonesia (ID)' : 'English (EN)'}
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-[#FFD700]/40 text-slate-900 dark:text-amber-100 flex items-start gap-3">
            <FileWarning className="w-5 h-5 text-[#FFD700] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-[#FFD700]">
                {language === 'en'
                  ? 'NOT FOR REAL-WORLD SURGICAL OR DIAGNOSTIC MEDICAL PURPOSES'
                  : 'BUKAN UNTUK TUJUAN BEDAH ATAU DIAGNOSIS MEDIS DUNIA NYATA'}
              </p>
              <p className="mt-1 text-xs md:text-sm">
                {language === 'en'
                  ? 'Karina 3D Lab is strictly a vocational training simulator for students and aspiring medical-device technicians. Never use this software or its exported STL/OBJ/STEP meshes for real patient diagnosis, surgical navigation, or clinical implant manufacturing.'
                  : 'Karina 3D Lab murni merupakan simulator pelatihan vokasi bagi mahasiswa dan teknisi alat kesehatan. Jangan pernah menggunakan perangkat lunak ini atau hasil ekspor STL/OBJ/STEP untuk diagnosis pasien nyata, navigasi bedah, atau pembuatan implan klinis.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-[#00E5FF]">
              <Lock className="w-4 h-4" />
              <span>
                {language === 'en'
                  ? 'HIPAA-Aligned Training Data Virtualization & Encryption Protocol'
                  : 'Protokol Virtualisasi Data Pelatihan & Enkripsi Selaras HIPAA'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'en'
                ? 'All volumetric CT datasets provided in this platform are 100% synthetic, anonymized anatomical phantoms containing zero Protected Health Information (PHI). All training sessions and audit logs are protected via Role-Based Access Control (RBAC) and client-side AES-256 / SHA-256 integrity digests.'
                : 'Seluruh dataset CT volumetrik pada platform ini adalah fantom anatomi sintetis dan anonim 100% tanpa Informasi Kesehatan Pribadi (PHI) pasien nyata. Seluruh sesi pelatihan dan log audit dilindungi dengan Kontrol Akses Berbasis Peran (RBAC) serta hash integritas AES-256 / SHA-256.'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF] transition-colors">
              <input
                type="checkbox"
                checked={checked1}
                onChange={(e) => setChecked1(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#00E5FF]"
              />
              <span className="text-xs md:text-sm">
                {language === 'en'
                  ? 'I understand that Karina 3D Lab is strictly for educational and vocational training purposes and must NEVER be used for real-world clinical surgery or medical diagnosis.'
                  : 'Saya memahami bahwa Karina 3D Lab hanya untuk pelatihan pendidikan dan vokasi serta TIDAK BOLEH digunakan untuk bedah klinis atau diagnosis medis nyata.'}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#00E5FF] transition-colors">
              <input
                type="checkbox"
                checked={checked2}
                onChange={(e) => setChecked2(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#00E5FF]"
              />
              <span className="text-xs md:text-sm">
                {language === 'en'
                  ? 'I agree to only upload anonymized or synthetic training NIfTI/DICOM files (never real patient records) and consent to immutable security audit logging of my training actions.'
                  : 'Saya setuju untuk hanya mengunggah file latihan NIfTI/DICOM anonim atau sintetis (bukan rekam medis pasien nyata) dan menyetujui pencatatan log audit keamanan selama pelatihan.'}
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            disabled={!canProceed}
            onClick={onAcknowledge}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              canProceed
                ? 'bg-[#00E5FF] text-[#0A192F] hover:bg-cyan-300 cursor-pointer shadow-lg'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{t.acknowledgeBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
