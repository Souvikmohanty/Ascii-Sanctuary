import React, { useState } from 'react';
import { Check, ChevronDown, Copy, Mountain, RotateCcw, Sparkles, X } from 'lucide-react';
import { TWEAK_DEFINITIONS, TweakMeta } from '../data/presets';
import { SCENERY_TWEAK_DEFINITIONS, SceneryTweakMeta } from '../data/sceneries';
import {
  BackgroundMode,
  BuiltinSceneryId,
  CreatureTweaks,
  SceneryConfig,
  SceneryTweaks,
  SpeciesConfig,
} from '../types/creature';

interface TweaksPanelProps {
  backgroundMode: BackgroundMode;
  onChangeBackgroundMode: (mode: BackgroundMode) => void;
  speciesList: SpeciesConfig[];
  activeSpecies: SpeciesConfig;
  onSelectSpecies: (id: string) => void;
  onUpdateTweak: <K extends keyof CreatureTweaks>(key: K, value: CreatureTweaks[K]) => void;
  onResetTweak: (key: keyof CreatureTweaks) => void;
  onResetAll: () => void;
  sceneryList: SceneryConfig[];
  activeScenery: SceneryConfig;
  onSelectScenery: (id: BuiltinSceneryId) => void;
  onUpdateSceneryTweak: <K extends keyof SceneryTweaks>(key: K, value: SceneryTweaks[K]) => void;
  onResetSceneryTweak: (key: keyof SceneryTweaks) => void;
  onResetAllScenery: () => void;
  onClose: () => void;
}

export const TweaksPanel: React.FC<TweaksPanelProps> = ({
  backgroundMode,
  onChangeBackgroundMode,
  speciesList,
  activeSpecies,
  onSelectSpecies,
  onUpdateTweak,
  onResetTweak,
  onResetAll,
  sceneryList,
  activeScenery,
  onSelectScenery,
  onUpdateSceneryTweak,
  onResetSceneryTweak,
  onResetAllScenery,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    tooltip: string;
    top: number;
  } | null>(null);

  const handleCopyJson = async () => {
    try {
      const payload =
        backgroundMode === 'sceneries'
          ? JSON.stringify(
              { scenery: activeScenery.name, tweaks: activeScenery.tweaks },
              null,
              2
            )
          : JSON.stringify(
              { species: activeSpecies.name, tweaks: activeSpecies.tweaks },
              null,
              2
            );
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures
    }
  };

  const renderAnimalSection = (
    sectionKey: 'movement' | 'motion' | 'look',
    title: string
  ) => {
    const items = TWEAK_DEFINITIONS.filter((d) => d.section === sectionKey);

    return (
      <div className="pt-3.5 pb-2 border-t border-white/8 first:border-t-0 first:pt-1">
        <h3 className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase mb-2.5 font-mono">
          {title}
        </h3>
        <div className="space-y-3">
          {items.map((item: TweakMeta) => {
            const label =
              item.key === 'flutter'
                ? activeSpecies.motionLabels.flutter
                : item.key === 'glide'
                ? activeSpecies.motionLabels.glide
                : item.key === 'flapRate'
                ? activeSpecies.motionLabels.flapRate
                : item.label;

            if (item.key === 'cornerToCorner') {
              const checked = activeSpecies.tweaks.cornerToCorner;
              return (
                <div
                  key={item.key}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredTooltip({ tooltip: item.tooltip, top: rect.top });
                  }}
                  onMouseLeave={() => setHoveredTooltip(null)}
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="text-xs text-slate-200 select-none cursor-help">
                    {label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={label}
                    onClick={() => onUpdateTweak('cornerToCorner', !checked)}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                      checked ? 'bg-[#38bdf8]' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            }

            const min = item.min ?? 0;
            const max = item.max ?? 1;
            const step = item.step ?? 0.05;
            const decimals = item.decimals ?? 2;
            const rawVal = Number(activeSpecies.tweaks[item.key]);
            const isDisabled =
              item.key === 'direction' && activeSpecies.tweaks.cornerToCorner;
            const pct = Math.max(0, Math.min(100, ((rawVal - min) / (max - min)) * 100));

            return (
              <div
                key={item.key}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredTooltip({ tooltip: item.tooltip, top: rect.top });
                }}
                onMouseLeave={() => setHoveredTooltip(null)}
                className={`space-y-1.5 transition-opacity ${
                  isDisabled ? 'opacity-45' : 'opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`tweak-${item.key}`}
                    className="text-slate-200 cursor-help select-none"
                  >
                    {label}
                  </label>
                  <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                    {rawVal.toFixed(decimals)}
                  </span>
                </div>
                <input
                  id={`tweak-${item.key}`}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  disabled={isDisabled}
                  value={rawVal}
                  onChange={(e) =>
                    onUpdateTweak(
                      item.key,
                      parseFloat(e.target.value) as CreatureTweaks[typeof item.key]
                    )
                  }
                  onDoubleClick={() => onResetTweak(item.key)}
                  title="Double-click to reset"
                  className="obsidian-slider w-full h-3.5"
                  style={{
                    background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, rgba(255,255,255,0.14) ${pct}%, rgba(255,255,255,0.14) 100%)`,
                    height: '4px',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScenerySection = (sectionKey: 'motion' | 'look', title: string) => {
    const items = SCENERY_TWEAK_DEFINITIONS.filter((d) => d.section === sectionKey);

    return (
      <div className="pt-3.5 pb-2 border-t border-white/8 first:border-t-0 first:pt-1">
        <h3 className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase mb-2.5 font-mono">
          {title}
        </h3>
        <div className="space-y-3">
          {items.map((item: SceneryTweakMeta) => {
            const rawVal = Number(activeScenery.tweaks[item.key]);
            const pct = Math.max(
              0,
              Math.min(100, ((rawVal - item.min) / (item.max - item.min)) * 100)
            );

            return (
              <div
                key={item.key}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredTooltip({ tooltip: item.tooltip, top: rect.top });
                }}
                onMouseLeave={() => setHoveredTooltip(null)}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`scenery-tweak-${item.key}`}
                    className="text-slate-200 cursor-help select-none"
                  >
                    {item.label}
                  </label>
                  <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                    {rawVal.toFixed(item.decimals)}
                  </span>
                </div>
                <input
                  id={`scenery-tweak-${item.key}`}
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={rawVal}
                  onChange={(e) =>
                    onUpdateSceneryTweak(item.key, parseFloat(e.target.value))
                  }
                  onDoubleClick={() => onResetSceneryTweak(item.key)}
                  title="Double-click to reset"
                  className="obsidian-slider w-full h-3.5"
                  style={{
                    background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, rgba(255,255,255,0.14) ${pct}%, rgba(255,255,255,0.14) 100%)`,
                    height: '4px',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {hoveredTooltip && (
        <div
          className="hidden md:block fixed right-[344px] z-40 w-64 p-3 rounded-xl bg-[#111726]/95 backdrop-blur-2xl border border-white/12 shadow-2xl pointer-events-none transition-all duration-100"
          style={{
            top: Math.min(window.innerHeight - 130, Math.max(64, hoveredTooltip.top - 8)),
          }}
        >
          <p className="text-xs text-slate-200 leading-relaxed">
            {hoveredTooltip.tooltip}
          </p>
        </div>
      )}

      <aside
        aria-label="Sanctuary Tweaks Panel"
        className="fixed top-14 right-3 bottom-3 z-30 w-[calc(100vw-24px)] sm:w-[316px] flex flex-col rounded-xl bg-[#101522]/90 backdrop-blur-2xl border border-white/12 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-white tracking-tight">Tweaks</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/6 hover:bg-white/12 text-[11px] font-medium text-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={backgroundMode === 'sceneries' ? onResetAllScenery : onResetAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/6 hover:bg-white/12 text-[11px] font-medium text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Tweaks"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Background Mode Switcher & Preset Selector */}
        <div className="px-4 pt-3 pb-2 space-y-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/40 border border-white/8">
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

          <div className="relative">
            {backgroundMode === 'animals' ? (
              <select
                aria-label="Select species to tweak"
                value={activeSpecies.id}
                onChange={(e) => onSelectSpecies(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-black/40 border border-white/12 text-xs font-medium text-white focus:outline-none focus:border-[#38bdf8]/60"
              >
                {speciesList.map((sp) => (
                  <option key={sp.id} value={sp.id} className="bg-[#0e131f] text-white">
                    {sp.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Select scenery to tweak"
                value={activeScenery.id}
                onChange={(e) => onSelectScenery(e.target.value as BuiltinSceneryId)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg bg-black/40 border border-white/12 text-xs font-medium text-white focus:outline-none focus:border-[#38bdf8]/60"
              >
                {sceneryList.map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-[#0e131f] text-white">
                    {sc.name}
                  </option>
                ))}
              </select>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Scrollable Parameter Sections */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 obsidian-scroll">
          {backgroundMode === 'animals' ? (
            <>
              {renderAnimalSection('movement', 'MOVEMENT')}
              {renderAnimalSection('motion', activeSpecies.motionSectionLabel)}
              {renderAnimalSection('look', 'LOOK')}
            </>
          ) : (
            <>
              {renderScenerySection('motion', 'ATMOSPHERE')}
              {renderScenerySection('look', 'LOOK')}
            </>
          )}
        </div>
      </aside>
    </>
  );
};
