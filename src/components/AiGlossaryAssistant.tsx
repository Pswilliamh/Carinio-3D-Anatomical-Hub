import React, { useState } from 'react';
import {
  Send,
  BookOpen,
  Search,
  MessageSquare,
  Cpu,
  Printer,
  ScanLine,
} from 'lucide-react';
import { GLOSSARY_ITEMS, Language } from '../i18n/translations';
import { MediaGalleryAndPdfLibrary } from './MediaGalleryAndPdfLibrary';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiGlossaryAssistantProps {
  language: Language;
  labContextSummary: string;
  onNotify?: (msg: string) => void;
}

export const AiGlossaryAssistant: React.FC<AiGlossaryAssistantProps> = ({
  language,
  labContextSummary,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text:
        language === 'en'
          ? 'Welcome to the Karina 3D Lab Vocational AI Assistant! Ask me any question about Computed Tomography (Hounsfield Units, beam-hardening scatter), 3D skeletal anatomical modeling (Marching Cubes, Region Growing), optical laser surface scanners, or SLA/DMLS 3D printing of STL/STEP files.'
          : 'Selamat datang di Asisten AI Vokasi Karina 3D Lab! Tanyakan apa saja mengenai Computed Tomography (Unit Hounsfield, artefak hamburan logam), pemodelan anatomi rangka 3D (Marching Cubes, Region Growing), pemindai permukaan laser optik, atau pencetakan 3D SLA/DMLS file STL/STEP.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const categories = ['ALL', 'CT Physics', '3D Modeling', 'TMJ Anatomy', '3D Printing & Scanners'];

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.termEn.toLowerCase().includes(q) ||
      item.termId.toLowerCase().includes(q) ||
      item.definitionEn.toLowerCase().includes(q) ||
      item.definitionId.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleSendQuestion = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? chatInput).trim();
    if (!promptToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          language,
          context: labContextSummary,
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to reach Gemini Vocational Assistant');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'No response returned.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Unexpected error calling Gemini API.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `API Notice: ${errText}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts =
    language === 'en'
      ? [
          'How do I separate the Mandibular Condyle from the Glenoid Fossa without bony fusion?',
          'Explain why dental amalgam fillings cause CT scatter streaks and how to clean them.',
          'How do optical laser scanners and SLA/DMLS 3D printers turn STL/STEP files into titanium implants?',
          'Why must we map the Inferior Alveolar Nerve pathway before TMJ prosthetic fixation?',
        ]
      : [
          'Bagaimana cara memisahkan Kondilus Mandibula dari Fosa Glenoid dengan Region Growing?',
          'Mengapa tambalan gigi logam menghasilkan artefak hamburan pada CT scan dan bagaimana membersihkannya?',
          'Bagaimana pemindai laser optik dan printer 3D SLA/DMLS mengubah file STL/STEP menjadi implan titanium?',
          'Mengapa jalur Saraf Alveolaris Inferior harus dipetakan sebelum pemasangan implan TMJ?',
        ];

  return (
    <div className="space-y-8 pb-12">
      {/* Google Drive Image Gallery & PDF Reference Library with AI Review & Overview */}
      <MediaGalleryAndPdfLibrary
        language={language}
        onNotify={(msg) => {
          if (onNotify) onNotify(msg);
        }}
      />

      {/* Educational Overview Banner: CT -> 3D Modeling -> Laser Scanning -> 3D Printing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#0088AA] dark:text-[#00E5FF] font-mono text-xs font-semibold">
            <Cpu className="w-4 h-4" />
            <span>01. COMPUTED TOMOGRAPHY & HU</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'X-Ray Attenuation & Voxel Reconstruction'
              : 'Atenuasi Sinar-X & Rekonstruksi Voksel'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'en'
              ? 'CT scanners measure X-ray attenuation in Hounsfield Units (HU). By isolating cortical bone (+350 to +2400 HU) and trimming metallic beam-hardening scatter (+2600+ HU), technicians create an accurate binary voxel mask.'
              : 'Pemindai CT mengukur atenuasi sinar-X dalam Unit Hounsfield (HU). Dengan mengisolasi tulang kortikal (+350 hingga +2400 HU) dan menghapus hamburan logam (+2600+ HU), teknisi menghasilkan mask voksel biner yang akurat.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#FFD700] font-mono text-xs font-semibold">
            <ScanLine className="w-4 h-4" />
            <span>02. OPTICAL LASER SURFACE SCANNERS</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'Sub-Millimeter Optical Registration'
              : 'Registrasi Permukaan Pemindai Laser Optik'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'en'
              ? 'Because dental fillings scatter CT X-rays on tooth cusps, optical blue-laser and structured-light intraoral scanners capture crown geometry at 0.02 mm resolution and align it with the CT bone mesh.'
              : 'Karena tambalan gigi menghamburkan sinar-X CT pada mahkota gigi, pemindai laser optik biru memindai permukaan gigi pada resolusi 0,02 mm lalu diselaraskan dengan mesh tulang CT.'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#0088AA] dark:text-[#00E5FF] font-mono text-xs font-semibold">
            <Printer className="w-4 h-4" />
            <span>03. SLA, DLP & DMLS 3D PRINTERS</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'en'
              ? 'STL Slicing & Titanium Implant Additive Manufacturing'
              : 'Pencetakan 3D SLA/DLP & Implan Titanium DMLS'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === 'en'
              ? 'Watertight .STL and .STEP files are sliced into 0.05 mm layers. SLA/DLP printers cure surgical resin models with UV lasers, while Direct Metal Laser Sintering (DMLS) fuses biocompatible Ti-6Al-4V titanium TMJ prostheses.'
              : 'File .STL dan .STEP kedap air diiris menjadi lapisan 0,05 mm. Printer SLA/DLP memadatkan resin bedah dengan laser UV, sedangkan DMLS melebur bubuk titanium Ti-6Al-4V menjadi implan sendi TMJ.'}
          </p>
        </div>
      </div>

      {/* Main Split: Left Searchable Bilingual Glossary | Right Gemini AI Vocational Instructor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Searchable Bilingual Glossary */}
        <div className="lg:col-span-7 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0088AA] dark:text-[#00E5FF]" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Bilingual CT, 3D Modeling & 3D Printing Glossary'
                  : 'Glosarium Bilingual CT, Pemodelan 3D & Printer 3D'}
              </h2>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search terms (HU, STL, TMJ)...' : 'Cari istilah (HU, STL, TMJ)...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          {/* Interactive Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
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

          {/* Glossary Cards */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredGlossary.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {language === 'en' ? item.termEn : item.termId}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === 'en' ? item.termId : item.termEn}
                    </p>
                  </div>
                  <div className="text-xs font-mono text-[#0088AA] dark:text-[#00E5FF]">
                    <span>{item.category}</span>
                    {item.clinicalRange && (
                      <>
                        <span className="mx-1.5 text-slate-500" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#FFD700]">{item.clinicalRange}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {language === 'en' ? item.definitionEn : item.definitionId}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Interactive Server-Side Gemini AI Vocational Assistant */}
        <div className="lg:col-span-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#00E5FF]" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'en'
                    ? 'AI Biomedical & 3D Printing Tutor'
                    : 'Tutor AI Biomedis & Pencetakan 3D'}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#FFD700]">EN / ID</span>
            </div>

            {/* Suggested Vocational Prompts */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {language === 'en' ? 'QUICK VOCATIONAL QUESTIONS:' : 'PERTANYAAN VOKASI CEPAT:'}
              </p>
              <div className="flex flex-col gap-1.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuestion(qp)}
                    className="text-left text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#0A192F] hover:border-[#00E5FF] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Message Transcript */}
          <div className="flex-1 min-h-[260px] max-h-[340px] overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-800">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg text-xs leading-relaxed space-y-1 ${
                  m.sender === 'user'
                    ? 'bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-slate-900 dark:text-white ml-6'
                    : 'bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 mr-4'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>{m.sender === 'user' ? 'STUDENT / TECH' : 'KARINA AI INSTRUCTOR'}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="p-3 rounded-lg bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 text-xs font-mono text-[#00E5FF]">
                {language === 'en'
                  ? 'Synthesizing CT & 3D printing answer...'
                  : 'Menyusun penjelasan CT & pencetakan 3D...'}
              </div>
            )}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Ask about CT HU, scatter, STL, laser scanners...'
                  : 'Tanyakan tentang HU CT, hamburan, STL, laser scanner...'
              }
              className="flex-1 px-3.5 py-2.5 text-xs rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#00E5FF]"
            />
            <button
              type="submit"
              disabled={isLoading || !chatInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#00E5FF] text-[#0A192F] font-semibold text-xs hover:bg-cyan-300 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Ask' : 'Kirim'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
