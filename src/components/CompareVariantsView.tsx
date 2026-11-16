import React, { useState } from 'react';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { GeneratedVariant } from '../types/creature';
import { AsciiPondCanvas } from './AsciiPondCanvas';

interface CompareVariantsViewProps {
  speciesGroup: string;
  speciesLabel: string;
  variants: GeneratedVariant[];
  isRegenerating: boolean;
  onPickVariant: (variant: GeneratedVariant) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

export const CompareVariantsView: React.FC<CompareVariantsViewProps> = ({
  speciesGroup,
  variants,
  isRegenerating,
  onPickVariant,
  onRegenerate,
  onBack,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-40 bg-[#050811] flex flex-col">
      {/* Top Comparison Bar matching Step 3 (00:14 - 00:19) */}
      <header className="pointer-events-none fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 pt-3.5 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e131f]/85 backdrop-blur-xl border border-white/12 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Center Group & 4 Variants Selector */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto max-w-[calc(100vw-220px)] px-2 py-1 rounded-xl bg-[#0e131f]/85 backdrop-blur-xl border border-white/12 shadow-2xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white whitespace-nowrap shrink-0">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: variants[0]?.dotColor || '#38bdf8' }}
            />
            <span>{speciesGroup}</span>
          </div>

          <div className="w-px h-4 bg-white/10 shrink-0" />

          <button
            type="button"
            onClick={() => setFocusedIndex(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              focusedIndex === null
                ? 'bg-white/14 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/6'
            }`}
          >
            All
          </button>

          {variants.map((v, idx) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onPickVariant(v)}
              onMouseEnter={() => setFocusedIndex(idx)}
              onMouseLeave={() => setFocusedIndex(null)}
              title={`Pick ${v.name} and launch full screen`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/12 whitespace-nowrap shrink-0 transition-colors"
            >
              <span className="font-mono text-[11px] text-slate-400">{idx + 1}.</span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: v.dotColor }}
              />
              <span>{v.name}</span>
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e131f]/85 backdrop-blur-xl border border-white/12 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-45"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>
        </div>
      </header>

      {/* 2x2 Live Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-4 md:grid-rows-2 w-full h-full">
        {variants.map((variant, idx) => {
          const isDimmed = focusedIndex !== null && focusedIndex !== idx;
          return (
            <div
              key={variant.id}
              className={`relative border-white/10 border-b md:odd:border-r md:[&:nth-child(n+3)]:border-b-0 overflow-hidden group cursor-pointer transition-opacity duration-200 ${
                isDimmed ? 'opacity-45' : 'opacity-100'
              }`}
              onClick={() => onPickVariant(variant)}
            >
              <AsciiPondCanvas
                speciesId={variant.id}
                dotColor={variant.dotColor}
                tweaks={{ ...variant.tweaks, amount: Math.min(8, variant.tweaks.amount) }}
                blueprint={variant.blueprint}
                cellSize={9}
                interactive={false}
              />

              {/* Subtle top-left quadrant label matching 00:15 */}
              <div className="pointer-events-none absolute top-14 md:top-16 left-4 right-4 flex items-start justify-between gap-3">
                <div className="max-w-md px-2.5 py-1.5 rounded-lg bg-[#050811]/75 backdrop-blur-md border border-white/8">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{idx + 1}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: variant.dotColor }}
                    />
                    <span className="text-xs font-semibold text-white">
                      {variant.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {variant.description}
                  </p>
                </div>

                <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#38bdf8] text-[#030712] text-[11px] font-semibold shadow-lg transition-opacity duration-150 shrink-0">
                  <Check className="w-3 h-3" />
                  <span>Use version</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Instruction Hint matching 00:18 */}
      <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
        <div className="px-4 py-2 rounded-xl bg-[#0e131f]/85 backdrop-blur-xl border border-white/12 text-xs text-slate-300 shadow-xl">
          All 4 side by side. Pick one at the top or click any quadrant to launch it full screen.
        </div>
      </div>
    </div>
  );
};
