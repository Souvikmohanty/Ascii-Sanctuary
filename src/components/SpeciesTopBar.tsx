import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mountain,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { BackgroundMode, BuiltinSceneryId, SceneryConfig, SpeciesConfig } from '../types/creature';

interface SpeciesTopBarProps {
  backgroundMode: BackgroundMode;
  onChangeBackgroundMode: (mode: BackgroundMode) => void;
  speciesList: SpeciesConfig[];
  activeSpecies: SpeciesConfig;
  onSelectSpecies: (id: string) => void;
  sceneryList: SceneryConfig[];
  activeScenery: SceneryConfig;
  onSelectScenery: (id: BuiltinSceneryId) => void;
  onOpenCreate: () => void;
  tweaksOpen: boolean;
  onToggleTweaks: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoHome: () => void;
  onAddressSearch: (query: string) => void;
}

export const SpeciesTopBar: React.FC<SpeciesTopBarProps> = ({
  backgroundMode,
  onChangeBackgroundMode,
  speciesList,
  activeSpecies,
  onSelectSpecies,
  sceneryList,
  activeScenery,
  onSelectScenery,
  onOpenCreate,
  tweaksOpen,
  onToggleTweaks,
  zenMode,
  onToggleZenMode,
  currentUrl,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onGoHome,
  onAddressSearch,
}) => {
  const [stackOpen, setStackOpen] = useState(false);
  const [addressEditing, setAddressEditing] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const stackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!stackOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (stackRef.current && !stackRef.current.contains(e.target as Node)) {
        setStackOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [stackOpen]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressDraft.trim();
    setAddressEditing(false);
    if (!trimmed || trimmed.startsWith('sanctuary://')) return;
    onAddressSearch(trimmed);
    setAddressDraft('');
  };

  const activeItem = backgroundMode === 'sceneries' ? activeScenery : activeSpecies;
  const activeCollection = backgroundMode === 'sceneries' ? sceneryList : speciesList;

  const previewDots = [
    activeItem,
    ...activeCollection.filter((item) => item.id !== activeItem.id).slice(0, 2),
  ];

  return (
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-2.5 px-3 pt-3 sm:px-5">
      {/* Left Minimalist Browser Navigation */}
      <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-[#0e131f]/78 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] shrink-0">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back"
          aria-label="Back"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Forward"
          aria-label="Forward"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onGoHome}
          title="New Tab Home"
          aria-label="Home"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Minimalist Address / Search Bar */}
      <form
        onSubmit={handleAddressSubmit}
        className="pointer-events-auto hidden sm:flex items-center gap-2 flex-1 max-w-md px-3 py-1.5 rounded-xl bg-[#0e131f]/78 backdrop-blur-xl border border-white/10 focus-within:border-[#38bdf8]/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors"
      >
        {addressEditing ? (
          <Search className="w-3.5 h-3.5 text-[#8ed5ff] shrink-0" />
        ) : (
          <Lock className="w-3 h-3 text-slate-500 shrink-0" />
        )}
        <input
          type="text"
          value={addressEditing ? addressDraft : currentUrl}
          onFocus={() => {
            setAddressEditing(true);
            setAddressDraft(
              currentUrl.startsWith('sanctuary://search?q=')
                ? decodeURIComponent(currentUrl.replace('sanctuary://search?q=', ''))
                : ''
            );
          }}
          onBlur={() => {
            setAddressEditing(false);
          }}
          onChange={(e) => setAddressDraft(e.target.value)}
          placeholder="Search Google or enter query..."
          aria-label="Browser address and search bar"
          className="w-full bg-transparent text-xs font-mono text-slate-300 placeholder:text-slate-500 focus:text-white focus:outline-none truncate"
        />
      </form>

      {/* Right Stacked Background Picker (Animals or Sceneries) + Focus + Tweaks */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <div className="relative" ref={stackRef}>
          <button
            type="button"
            onClick={() => setStackOpen((o) => !o)}
            aria-expanded={stackOpen}
            aria-haspopup="listbox"
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
              stackOpen
                ? 'bg-white/14 text-white border-white/25'
                : 'bg-[#0e131f]/80 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {/* Overlapping stacked preview dots */}
            <span className="flex items-center" aria-hidden="true">
              {previewDots.map((item, i) => (
                <span
                  key={item.id}
                  className={`w-2.5 h-2.5 rounded-full border border-[#0e131f] ${
                    i > 0 ? '-ml-1 opacity-75' : ''
                  }`}
                  style={{ backgroundColor: item.dotColor }}
                />
              ))}
            </span>
            <span>{activeItem.name}</span>
            <span className="font-mono text-[10px] text-slate-400 tabular-nums">
              {activeCollection.length}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                stackOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {stackOpen && (
            <div
              role="listbox"
              aria-label="Background selection"
              className="absolute right-0 top-full mt-2 w-68 p-2 rounded-xl bg-[#0f1523]/95 backdrop-blur-2xl border border-white/14 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] z-50"
            >
              {/* Segmented Background Mode Selector: Animals vs Sceneries */}
              <div className="grid grid-cols-2 gap-1 p-1 mb-2 rounded-lg bg-black/40 border border-white/8">
                <button
                  type="button"
                  onClick={() => onChangeBackgroundMode('animals')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    backgroundMode === 'animals'
                      ? 'bg-white/14 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Animals</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeBackgroundMode('sceneries')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    backgroundMode === 'sceneries'
                      ? 'bg-white/14 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mountain className="w-3 h-3" />
                  <span>Sceneries</span>
                </button>
              </div>

              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {backgroundMode === 'sceneries' ? 'ASCII Sceneries' : 'Sanctuary Animals'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                  Keys 1–{Math.min(9, activeCollection.length)}
                </span>
              </div>

              {backgroundMode === 'animals' ? (
                <>
                  <div className="max-h-72 overflow-y-auto obsidian-scroll space-y-0.5">
                    {speciesList.map((sp, idx) => {
                      const isActive = sp.id === activeSpecies.id;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => {
                            onSelectSpecies(sp.id);
                            setStackOpen(false);
                          }}
                          className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-white/12 text-white'
                              : 'text-slate-300 hover:text-white hover:bg-white/6'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: sp.dotColor,
                                boxShadow: isActive ? `0 0 8px ${sp.dotColor}` : 'none',
                              }}
                            />
                            <span className="truncate">{sp.name}</span>
                          </span>
                          {idx < 9 && (
                            <span className="font-mono text-[10px] text-slate-500 shrink-0 tabular-nums">
                              {idx + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-white/10 my-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setStackOpen(false);
                      onOpenCreate();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#8ed5ff] hover:text-white hover:bg-[#38bdf8]/15 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New animal</span>
                  </button>
                </>
              ) : (
                <div className="max-h-80 overflow-y-auto obsidian-scroll space-y-0.5">
                  {sceneryList.map((sc, idx) => {
                    const isActive = sc.id === activeScenery.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onSelectScenery(sc.id);
                          setStackOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left transition-colors ${
                          isActive
                            ? 'bg-white/12 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-white/6'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                            style={{
                              backgroundColor: sc.dotColor,
                              boxShadow: isActive ? `0 0 8px ${sc.dotColor}` : 'none',
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{sc.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {sc.subtitle}
                            </div>
                          </div>
                        </div>
                        {idx < 9 && (
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-2 tabular-nums">
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleZenMode}
          title={zenMode ? 'Show search workspace' : 'Focus mode'}
          aria-label={zenMode ? 'Show search workspace' : 'Focus mode'}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0e131f]/80 backdrop-blur-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
        >
          {zenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onToggleTweaks}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 backdrop-blur-xl border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
            tweaksOpen
              ? 'bg-[#38bdf8]/18 text-[#8ed5ff] border-[#38bdf8]/40 shadow-[0_0_16px_-4px_rgba(56,189,248,0.4)]'
              : 'bg-[#0e131f]/80 text-slate-200 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Tweaks</span>
        </button>
      </div>
    </header>
  );
};
