import React, { useMemo, useState } from 'react';
import { Film, Play, RefreshCw, Search, Sparkles } from 'lucide-react';
import { Language } from '../i18n/translations';
import { LibraryVideoItem, VideoCategoryId } from '../data/videoLibrary';

interface VideoLibraryPanelProps {
  language: Language;
  videos: LibraryVideoItem[];
  activeVideoId?: string;
  onSelectVideo?: (video: LibraryVideoItem) => void;
  onSyncDrive?: () => void;
  syncingDrive?: boolean;
  showInlineTheater?: boolean;
  compactHeader?: boolean;
}

export const VideoLibraryPanel: React.FC<VideoLibraryPanelProps> = ({
  language,
  videos,
  activeVideoId,
  onSelectVideo,
  onSyncDrive,
  syncingDrive = false,
  showInlineTheater = false,
  compactHeader = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<VideoCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [localTheaterId, setLocalTheaterId] = useState<string>(videos[0]?.id || 'promo_5');

  const currentTheaterId = activeVideoId || localTheaterId;
  const theaterVideo = videos.find((v) => v.id === currentTheaterId) || videos[0];

  const categories: Array<{ id: VideoCategoryId; en: string; idLabel: string; count: number }> =
    useMemo(
      () => [
        { id: 'all', en: 'All Videos', idLabel: 'Semua Video', count: videos.length },
        {
          id: 'biomechanics',
          en: 'TMJ Biomechanics & Bioprinting',
          idLabel: 'Biomekanika & Bioprinting TMJ',
          count: videos.filter((v) => v.category === 'biomechanics').length,
        },
        {
          id: 'dental_ct',
          en: 'Dental & CT Segmentation',
          idLabel: 'Gigi & Segmentasi CT',
          count: videos.filter((v) => v.category === 'dental_ct').length,
        },
        {
          id: 'implant_cad',
          en: 'Implant CAD & Workflow',
          idLabel: 'CAD Implan & Alur Kerja',
          count: videos.filter((v) => v.category === 'implant_cad').length,
        },
      ],
      [videos],
    );

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter((vid) => {
      if (selectedCategory !== 'all' && vid.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        vid.titleEn.toLowerCase().includes(q) ||
        vid.titleId.toLowerCase().includes(q) ||
        vid.subtitleEn.toLowerCase().includes(q) ||
        vid.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [videos, selectedCategory, searchQuery]);

  const handleCardSelect = (vid: LibraryVideoItem) => {
    setLocalTheaterId(vid.id);
    onSelectVideo?.(vid);
  };

  return (
    <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0088AA] dark:text-[#00E5FF]">
            <Film className="w-4 h-4" />
            <span>
              KARINA 3D LAB //{' '}
              {language === 'en'
                ? `EMBEDDED VIDEO LIBRARY (${videos.length})`
                : `PUSTAKA VIDEO TERTANAM (${videos.length})`}
            </span>
          </div>
          <h2 className={`${compactHeader ? 'text-lg' : 'text-xl'} font-bold text-slate-900 dark:text-white`}>
            {language === 'en'
              ? 'Training Documentaries, Biomechanics Briefs & 3D Workflow Reels'
              : 'Dokumenter Pelatihan, Kajian Biomekanika & Video Alur Kerja 3D'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {language === 'en'
              ? 'All six videos from your Karina 3D Lab Google Drive folder are organized and playable natively inside this library—no pop-outs required.'
              : 'Keenam video dari folder Google Drive Karina 3D Lab Anda tersusun rapi dan dapat diputar langsung di dalam pustaka ini tanpa keluar halaman.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search videos...' : 'Cari video...'}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#00E5FF] w-44 sm:w-52"
            />
          </div>

          {onSyncDrive && (
            <button
              onClick={onSyncDrive}
              disabled={syncingDrive}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A192F] border border-slate-300 dark:border-slate-700 hover:border-[#00E5FF] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#0088AA] dark:text-[#00E5FF] ${
                  syncingDrive ? 'animate-spin' : ''
                }`}
              />
              <span>
                {syncingDrive
                  ? language === 'en'
                    ? 'Syncing Drive...'
                    : 'Menyinkronkan...'
                  : language === 'en'
                    ? 'Sync Drive'
                    : 'Sinkron Drive'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#00E5FF] text-[#0A192F]'
                  : 'bg-slate-100 dark:bg-[#0A192F] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#00E5FF]'
              }`}
            >
              <span>{language === 'en' ? cat.en : cat.idLabel}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  active
                    ? 'bg-[#0A192F]/20 text-[#0A192F]'
                    : 'bg-slate-200 dark:bg-[#112240] text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional Dedicated Inline Theater Player (used inside Media Gallery & Library tab) */}
      {showInlineTheater && theaterVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 dark:bg-[#0A192F] border border-[#00E5FF]/40 rounded-xl overflow-hidden">
          <div className="lg:col-span-8 bg-black aspect-video relative">
            <video
              key={theaterVideo.id}
              src={theaterVideo.src}
              poster={theaterVideo.poster}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            />
          </div>
          <div className="lg:col-span-4 p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-[#FFD700]">
                  {language === 'en' ? theaterVideo.badgeEn : theaterVideo.badgeId}
                </span>
                <span className="text-[10px] font-mono text-[#0088AA] dark:text-[#00E5FF]">
                  {theaterVideo.durationLabel}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {language === 'en' ? theaterVideo.titleEn : theaterVideo.titleId}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'en' ? theaterVideo.subtitleEn : theaterVideo.subtitleId}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              {theaterVideo.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#112240] text-slate-700 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Library Grid (All Videos Playable Directly Inline!) */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
          {language === 'en'
            ? 'No videos match your search filter.'
            : 'Tidak ada video yang cocok dengan pencarian Anda.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((vid) => {
            const isSelected = vid.id === currentTheaterId;
            return (
              <div
                key={vid.id}
                className={`bg-slate-50 dark:bg-[#0A192F] border rounded-xl overflow-hidden flex flex-col transition-all ${
                  isSelected
                    ? 'border-[#00E5FF] ring-1 ring-[#00E5FF]/30'
                    : vid.isNew
                      ? 'border-amber-400/50 dark:border-[#FFD700]/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div className="aspect-video bg-black relative">
                  <video
                    src={vid.src}
                    poster={vid.poster}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain bg-black"
                  />
                  {vid.isNew && (
                    <span className="absolute top-2 left-2 pointer-events-none inline-flex items-center gap-1 bg-[#0A192F]/90 border border-[#FFD700]/70 text-[#FFD700] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      {language === 'en' ? 'NEW' : 'BARU'}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#FFD700] truncate">
                        {language === 'en' ? vid.badgeEn : vid.badgeId}
                      </span>
                      <span className="text-[10px] font-mono text-[#0088AA] dark:text-[#00E5FF] shrink-0">
                        {vid.durationLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {language === 'en' ? vid.titleEn : vid.titleId}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {language === 'en' ? vid.subtitleEn : vid.subtitleId}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 overflow-hidden max-h-5">
                      {vid.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-[#112240] text-slate-600 dark:text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCardSelect(vid)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#00E5FF] text-[#0A192F]'
                          : 'bg-slate-200 dark:bg-[#112240] text-slate-800 dark:text-[#00E5FF] hover:bg-[#00E5FF]/20'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      <span>
                        {isSelected
                          ? language === 'en'
                            ? 'In Theater'
                            : 'Di Layar Utama'
                          : language === 'en'
                            ? 'Play in Theater'
                            : 'Putar Utama'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
