import React, { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';

interface CreateAnimalModalProps {
  initialPrompt?: string;
  isGenerating: boolean;
  error: string | null;
  onGenerate: (prompt: string) => void;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    label: 'Sea turtle',
    prompt:
      'Sea turtle with patterned mosaic carapace and sweeping front flippers, gliding calmly across deep ocean currents',
  },
  {
    label: 'Manta ray',
    prompt:
      'Graceful oceanic manta ray with broad diamond wings and trailing tail filament, bioluminescent cyan underside',
  },
  {
    label: 'Firefly',
    prompt:
      'Summer night firefly with warm amber-gold glowing abdomen pulsing softly and quick fluttering translucent wings',
  },
  {
    label: 'Octopus',
    prompt:
      'Deep-sea octopus pulsing forward with eight undulating trailing tentacles and shimmering coral-violet spots',
  },
  {
    label: 'Phoenix',
    prompt:
      'Radiant ember phoenix with wide feathered wings leaving glowing orange and gold spark trails',
  },
];

export const CreateAnimalModal: React.FC<CreateAnimalModalProps> = ({
  initialPrompt = '',
  isGenerating,
  error,
  onGenerate,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-animal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#101624]/95 border border-white/14 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.1)] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              id="create-animal-title"
              className="text-lg font-semibold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Describe a new ASCII animal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              The more you describe how it looks, its colors, and how it moves, the better the 4 generated versions turn out.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g. Sea turtle with olive-amber shell plates, sweeping front flippers, and a calm underwater glide..."
              className="w-full px-3.5 py-3 rounded-lg bg-black/45 border border-white/12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8]/70 resize-none leading-relaxed"
              autoFocus
            />
          </div>

          {/* Quick inspiration buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              Try an example prompt
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setPrompt(ex.prompt)}
                  className="px-2.5 py-1 rounded-md bg-white/6 hover:bg-white/12 border border-white/8 text-xs text-slate-200 transition-colors disabled:opacity-40"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-[#93000a]/40 border border-[#ffb4ab]/30 text-xs text-[#ffb4ab]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#38bdf8]/20 hover:bg-[#38bdf8] hover:text-[#030712] border border-[#38bdf8]/50 text-xs font-semibold text-[#8ed5ff] transition-all disabled:opacity-40 disabled:hover:bg-[#38bdf8]/20 disabled:hover:text-[#8ed5ff]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing 4 versions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate 4 versions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
