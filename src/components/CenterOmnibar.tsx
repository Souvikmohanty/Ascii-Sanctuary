import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AskResponseState, AttachedContextItem } from '../types/creature';

interface CenterOmnibarProps {
  userName: string;
  onUpdateUserName: (name: string) => void;
  attachments: AttachedContextItem[];
  onAddAttachment: (item: AttachedContextItem) => void;
  onRemoveAttachment: (id: string) => void;
  askState: AskResponseState | null;
  onSubmitQuery: (query: string) => void;
  onClearAnswer: () => void;
  onCreateAnimalFromPrompt: (prompt: string) => void;
  accentColor: string;
}

function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) return 'Still up,';
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export const CenterOmnibar: React.FC<CenterOmnibarProps> = ({
  userName,
  onUpdateUserName,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  askState,
  onSubmitQuery,
  onClearAnswer,
  onCreateAnimalFromPrompt,
  accentColor,
}) => {
  const [query, setQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [tabTitle, setTabTitle] = useState('');
  const [tabUrl, setTabUrl] = useState('');
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNameDraft(userName);
  }, [userName]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [attachMenuOpen]);

  const greetingPrefix = getGreetingPrefix();
  const isLateNight = greetingPrefix === 'Still up,';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSubmitQuery(trimmed);
  };

  const handleNameSave = () => {
    const cleaned = nameDraft.trim() || 'Souvik';
    onUpdateUserName(cleaned);
    setEditingName(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const text = await f.text().catch(() => '');
      onAddAttachment({
        id: `file-${Date.now()}-${i}`,
        type: 'file',
        title: f.name,
        content: text.slice(0, 4000) || `Attached file: ${f.name} (${f.size} bytes)`,
      });
    }
    e.target.value = '';
    setAttachMenuOpen(false);
  };

  const handleAddTab = () => {
    if (!tabTitle.trim() && !tabUrl.trim()) return;
    const title = tabTitle.trim() || tabUrl.trim();
    const content = tabUrl.trim() ? `Tab reference: ${title} (${tabUrl.trim()})` : title;
    onAddAttachment({
      id: `tab-${Date.now()}`,
      type: 'tab',
      title,
      content,
    });
    setTabTitle('');
    setTabUrl('');
    setAttachMenuOpen(false);
  };

  const handleCopyAnswer = async () => {
    if (!askState?.answer) return;
    try {
      await navigator.clipboard.writeText(askState.answer);
      setCopiedAnswer(true);
      setTimeout(() => setCopiedAnswer(false), 1600);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-[600px] flex-col items-center">
        {/* Minimal Luminous Crest */}
        <div
          className="mb-4 w-9 h-9 rounded-full border border-white/15 transition-shadow duration-500"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #f5f5e8 0%, #cbd5c0 45%, #5b6458 100%)',
            boxShadow: `0 0 28px -4px ${accentColor}55`,
          }}
          aria-hidden="true"
        />

        {/* Editorial Greeting in Fraunces */}
        <div className="mb-6 flex items-center justify-center text-center">
          <h1
            className="text-3xl sm:text-[38px] leading-tight font-normal tracking-[-0.02em] text-[#eef2ff]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="text-slate-200/95">{greetingPrefix} </span>
            {editingName ? (
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setNameDraft(userName);
                    setEditingName(false);
                  }
                }}
                autoFocus
                maxLength={24}
                aria-label="Edit your display name"
                className="inline-block w-40 bg-white/10 border border-[#38bdf8]/50 rounded-lg px-2.5 py-0.5 text-white italic focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                title="Click to change your name"
                className="group inline-flex items-baseline gap-1.5 italic text-white hover:text-[#8ed5ff] transition-colors focus-visible:outline-none focus-visible:underline"
              >
                <span>
                  {userName}
                  {isLateNight ? '?' : ''}
                </span>
                <Pencil className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity self-center" />
              </button>
            )}
          </h1>
        </div>

        {/* Minimalist Search & Prompt Omnibar */}
        <form
          onSubmit={handleFormSubmit}
          className="relative w-full rounded-xl bg-[#101522]/82 backdrop-blur-2xl border border-white/12 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.1)] focus-within:border-[#38bdf8]/50 focus-within:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8),0_0_24px_-6px_rgba(56,189,248,0.28)] transition-all duration-200"
        >
          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google or ask anything..."
              aria-label="Search Google or ask anything"
              className="w-full bg-transparent text-[15px] text-[#f1f5f9] placeholder:text-slate-400/70 focus:outline-none"
            />
          </div>

          {/* Attached Context Chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {attachments.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/8 border border-white/10 text-xs text-slate-200"
                >
                  {item.type === 'file' ? (
                    <FileText className="w-3 h-3 text-[#8ed5ff]" />
                  ) : (
                    <Globe className="w-3 h-3 text-[#ffb95f]" />
                  )}
                  <span className="max-w-[140px] truncate">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Omnibar Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="relative" ref={attachMenuRef}>
              <button
                type="button"
                onClick={() => setAttachMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-100 hover:bg-white/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add tabs or files</span>
              </button>

              {attachMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 p-3 rounded-xl bg-[#131928]/95 backdrop-blur-2xl border border-white/14 shadow-2xl z-40">
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/6 hover:bg-white/12 text-xs font-medium text-slate-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#8ed5ff]" />
                      <span>Upload a text or code file</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.json,.ts,.tsx,.js,.py,.csv"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="h-px bg-white/10" />

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Pin a tab or note context
                      </p>
                      <input
                        type="text"
                        value={tabTitle}
                        onChange={(e) => setTabTitle(e.target.value)}
                        placeholder="Tab title (e.g. Koi care guide)"
                        className="w-full px-2.5 py-1.5 rounded-md bg-black/35 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8]/60"
                      />
                      <input
                        type="text"
                        value={tabUrl}
                        onChange={(e) => setTabUrl(e.target.value)}
                        placeholder="URL or snippet (optional)"
                        className="w-full px-2.5 py-1.5 rounded-md bg-black/35 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#38bdf8]/60"
                      />
                      <button
                        type="button"
                        onClick={handleAddTab}
                        className="w-full py-1.5 rounded-md bg-[#38bdf8]/15 hover:bg-[#38bdf8]/25 border border-[#38bdf8]/35 text-xs font-medium text-[#8ed5ff] transition-colors"
                      >
                        Attach tab context
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {query.trim().length > 2 && (
                <button
                  type="button"
                  onClick={() => onCreateAnimalFromPrompt(query.trim())}
                  title="Synthesize this description into 4 ASCII animals"
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#ffb95f] hover:bg-[#ffb95f]/15 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Spawn animal</span>
                </button>
              )}

              <button
                type="submit"
                disabled={!query.trim() || askState?.isLoading}
                aria-label="Search Google"
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 hover:bg-[#38bdf8] hover:text-[#030712] disabled:opacity-35 disabled:hover:bg-white/10 disabled:hover:text-slate-300 text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Google Search Grounded Response & Sources Card */}
        {askState && (
          <div className="mt-3 w-full rounded-xl bg-[#101522]/90 backdrop-blur-2xl border border-white/12 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-3.5 h-3.5 text-[#8ed5ff] shrink-0" />
                <span className="text-xs font-medium text-slate-300 truncate">
                  {askState.query}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {askState.answer && (
                  <button
                    type="button"
                    onClick={handleCopyAnswer}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    {copiedAnswer ? (
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
                )}
                <button
                  type="button"
                  onClick={onClearAnswer}
                  aria-label="Dismiss search result"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {askState.isLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-300">
                <span className="inline-block w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
                <span>Searching Google...</span>
              </div>
            ) : askState.error ? (
              <p className="text-xs text-[#ffb4ab] leading-relaxed">{askState.error}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#dde2f3] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto obsidian-scroll">
                  {askState.answer}
                </p>

                {askState.sources && askState.sources.length > 0 && (
                  <div className="pt-2.5 border-t border-white/10">
                    <p className="text-[11px] font-medium text-slate-400 mb-2">
                      Google Search Sources
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {askState.sources.map((src, i) => (
                        <a
                          key={`${src.url}-${i}`}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/6 hover:bg-[#38bdf8]/16 border border-white/10 hover:border-[#38bdf8]/40 text-xs text-slate-200 hover:text-white transition-colors max-w-[260px]"
                        >
                          <span className="truncate">{src.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
