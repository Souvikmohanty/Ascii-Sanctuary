import { useCallback, useEffect, useMemo, useState } from 'react';
import { AsciiPondCanvas } from './components/AsciiPondCanvas';
import { CenterOmnibar } from './components/CenterOmnibar';
import { CompareVariantsView } from './components/CompareVariantsView';
import { CreateAnimalModal } from './components/CreateAnimalModal';
import { SpeciesTopBar } from './components/SpeciesTopBar';
import { TweaksPanel } from './components/TweaksPanel';
import { BASE_TWEAKS, BUILTIN_SPECIES } from './data/presets';
import { BUILTIN_SCENERIES } from './data/sceneries';
import {
  AskResponseState,
  AttachedContextItem,
  BackgroundMode,
  BrowserHistoryEntry,
  BuiltinSceneryId,
  CreatureTweaks,
  CustomCreatureBlueprint,
  GeneratedVariant,
  MotionArchetype,
  SceneryConfig,
  SceneryTweaks,
  SearchSource,
  SpeciesConfig,
} from './types/creature';

const STORAGE_SPECIES_KEY = 'sanctuary.species.v4';
const LEGACY_SPECIES_KEY = 'sanctuary.species.v3';
const STORAGE_ACTIVE_ID_KEY = 'sanctuary.activeSpeciesId.v1';
const STORAGE_SCENERIES_KEY = 'sanctuary.sceneries.v1';
const STORAGE_ACTIVE_SCENERY_KEY = 'sanctuary.activeSceneryId.v1';
const STORAGE_BG_MODE_KEY = 'sanctuary.bgMode.v1';
const STORAGE_USERNAME_KEY = 'sanctuary.userName.v2';
const LEGACY_USERNAME_KEY = 'sanctuary.userName.v1';

interface GenerationSession {
  prompt: string;
  speciesGroup: string;
  speciesLabel: string;
  variants: GeneratedVariant[];
}

function loadInitialUserName(): string {
  try {
    const v2 = localStorage.getItem(STORAGE_USERNAME_KEY);
    if (v2 && v2.trim()) return v2.trim();
    const legacy = localStorage.getItem(LEGACY_USERNAME_KEY);
    if (legacy && legacy.trim() && legacy.trim() !== 'Stephen') {
      return legacy.trim();
    }
  } catch {
    // Ignore storage read errors
  }
  return 'Souvik';
}

function loadInitialSpecies(): SpeciesConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_SPECIES_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_SPECIES_KEY);
      if (legacyRaw) {
        const legacySaved = JSON.parse(legacyRaw) as SpeciesConfig[];
        if (Array.isArray(legacySaved)) {
          const customs = legacySaved.filter((s) => s.isCustom && s.blueprint);
          return [...BUILTIN_SPECIES, ...customs];
        }
      }
      return BUILTIN_SPECIES;
    }
    const saved = JSON.parse(raw) as SpeciesConfig[];
    if (!Array.isArray(saved) || saved.length === 0) return BUILTIN_SPECIES;

    const savedMap = new Map(saved.map((s) => [s.id, s]));
    const mergedBuiltins = BUILTIN_SPECIES.map((b) => {
      const match = savedMap.get(b.id);
      return match
        ? { ...b, tweaks: { ...b.defaultTweaks, ...match.tweaks } }
        : b;
    });
    const customs = saved.filter((s) => s.isCustom && s.blueprint);
    return [...mergedBuiltins, ...customs];
  } catch {
    return BUILTIN_SPECIES;
  }
}

function loadInitialSceneries(): SceneryConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCENERIES_KEY);
    if (!raw) return BUILTIN_SCENERIES;
    const saved = JSON.parse(raw) as SceneryConfig[];
    if (!Array.isArray(saved) || saved.length === 0) return BUILTIN_SCENERIES;
    const savedMap = new Map(saved.map((s) => [s.id, s]));
    return BUILTIN_SCENERIES.map((b) => {
      const match = savedMap.get(b.id);
      return match
        ? { ...b, tweaks: { ...b.defaultTweaks, ...match.tweaks } }
        : b;
    });
  } catch {
    return BUILTIN_SCENERIES;
  }
}

function loadInitialBgMode(): BackgroundMode {
  try {
    const saved = localStorage.getItem(STORAGE_BG_MODE_KEY);
    if (saved === 'animals' || saved === 'sceneries') return saved;
  } catch {
    // Ignore storage read errors
  }
  return 'animals';
}

export default function App() {
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(loadInitialBgMode);
  const [speciesList, setSpeciesList] = useState<SpeciesConfig[]>(loadInitialSpecies);
  const [activeSpeciesId, setActiveSpeciesId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_ID_KEY) || 'butterfly';
  });
  const [sceneryList, setSceneryList] = useState<SceneryConfig[]>(loadInitialSceneries);
  const [activeSceneryId, setActiveSceneryId] = useState<BuiltinSceneryId>(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE_SCENERY_KEY) as BuiltinSceneryId | null;
    return saved && BUILTIN_SCENERIES.some((s) => s.id === saved) ? saved : 'sakura-moonrise';
  });
  const [userName, setUserName] = useState<string>(loadInitialUserName);

  const [history, setHistory] = useState<BrowserHistoryEntry[]>(() => {
    const initialMode = loadInitialBgMode();
    const initialSpecies = localStorage.getItem(STORAGE_ACTIVE_ID_KEY) || 'butterfly';
    const savedScenery = localStorage.getItem(STORAGE_ACTIVE_SCENERY_KEY) as BuiltinSceneryId | null;
    const initialScenery =
      savedScenery && BUILTIN_SCENERIES.some((s) => s.id === savedScenery)
        ? savedScenery
        : 'sakura-moonrise';
    return [
      {
        url: 'sanctuary://home',
        mode: initialMode,
        speciesId: initialSpecies,
        sceneryId: initialScenery,
      },
    ];
  });
  const [historyIndex, setHistoryIndex] = useState(0);

  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  const [attachments, setAttachments] = useState<AttachedContextItem[]>([]);
  const [askState, setAskState] = useState<AskResponseState | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialPrompt, setCreateInitialPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [comparisonSession, setComparisonSession] = useState<GenerationSession | null>(null);

  const activeSpecies = useMemo(() => {
    return speciesList.find((s) => s.id === activeSpeciesId) || speciesList[0];
  }, [speciesList, activeSpeciesId]);

  const activeScenery = useMemo(() => {
    return sceneryList.find((s) => s.id === activeSceneryId) || sceneryList[0];
  }, [sceneryList, activeSceneryId]);

  const currentUrl = history[historyIndex]?.url || 'sanctuary://home';
  const activeAccentColor =
    backgroundMode === 'sceneries' ? activeScenery.dotColor : activeSpecies.dotColor;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SPECIES_KEY, JSON.stringify(speciesList));
    } catch {
      // Ignore storage quota errors
    }
  }, [speciesList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeSpeciesId);
    } catch {
      // Ignore storage errors
    }
  }, [activeSpeciesId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SCENERIES_KEY, JSON.stringify(sceneryList));
    } catch {
      // Ignore storage quota errors
    }
  }, [sceneryList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_SCENERY_KEY, activeSceneryId);
    } catch {
      // Ignore storage errors
    }
  }, [activeSceneryId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BG_MODE_KEY, backgroundMode);
    } catch {
      // Ignore storage errors
    }
  }, [backgroundMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERNAME_KEY, userName);
    } catch {
      // Ignore storage errors
    }
  }, [userName]);

  const pushHistory = useCallback(
    (entry: BrowserHistoryEntry) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const last = sliced[sliced.length - 1];
        if (
          last &&
          last.url === entry.url &&
          last.mode === entry.mode &&
          last.speciesId === entry.speciesId &&
          last.sceneryId === entry.sceneryId
        ) {
          return sliced;
        }
        const next = [...sliced, entry];
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex]
  );

  const handleChangeBackgroundMode = useCallback(
    (mode: BackgroundMode) => {
      setBackgroundMode(mode);
      pushHistory({
        url:
          mode === 'sceneries'
            ? `sanctuary://scenery/${activeSceneryId}`
            : `sanctuary://pond/${activeSpeciesId}`,
        mode,
        speciesId: activeSpeciesId,
        sceneryId: activeSceneryId,
      });
    },
    [activeSpeciesId, activeSceneryId, pushHistory]
  );

  const handleSelectSpecies = useCallback(
    (id: string) => {
      setBackgroundMode('animals');
      setActiveSpeciesId(id);
      pushHistory({
        url: `sanctuary://pond/${id}`,
        mode: 'animals',
        speciesId: id,
        sceneryId: activeSceneryId,
      });
    },
    [activeSceneryId, pushHistory]
  );

  const handleSelectScenery = useCallback(
    (id: BuiltinSceneryId) => {
      setBackgroundMode('sceneries');
      setActiveSceneryId(id);
      pushHistory({
        url: `sanctuary://scenery/${id}`,
        mode: 'sceneries',
        speciesId: activeSpeciesId,
        sceneryId: id,
      });
    },
    [activeSpeciesId, pushHistory]
  );

  const handleSubmitQuery = useCallback(
    async (query: string) => {
      setZenMode(false);
      pushHistory({
        url: `sanctuary://search?q=${encodeURIComponent(query)}`,
        mode: backgroundMode,
        speciesId: activeSpeciesId,
        sceneryId: activeSceneryId,
        query,
      });
      setAskState({ query, answer: '', sources: [], isLoading: true });
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            attachments: attachments.map((a) => ({
              title: a.title,
              content: a.content,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Search request failed');
        }
        setAskState({
          query,
          answer: data.answer || '',
          sources: Array.isArray(data.sources) ? (data.sources as SearchSource[]) : [],
          isLoading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setAskState({ query, answer: '', sources: [], isLoading: false, error: message });
      }
    },
    [attachments, backgroundMode, activeSpeciesId, activeSceneryId, pushHistory]
  );

  const handleGoBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    const entry = history[nextIdx];
    setHistoryIndex(nextIdx);
    if (entry) {
      setBackgroundMode(entry.mode);
      setActiveSpeciesId(entry.speciesId);
      setActiveSceneryId(entry.sceneryId);
      if (!entry.query) {
        setAskState(null);
      }
    }
  }, [historyIndex, history]);

  const handleGoForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    const entry = history[nextIdx];
    setHistoryIndex(nextIdx);
    if (entry) {
      setBackgroundMode(entry.mode);
      setActiveSpeciesId(entry.speciesId);
      setActiveSceneryId(entry.sceneryId);
      if (!entry.query) {
        setAskState(null);
      }
    }
  }, [historyIndex, history]);

  const handleGoHome = useCallback(() => {
    setZenMode(false);
    setAskState(null);
    setComparisonSession(null);
    pushHistory({
      url: 'sanctuary://home',
      mode: backgroundMode,
      speciesId: activeSpeciesId,
      sceneryId: activeSceneryId,
    });
  }, [backgroundMode, activeSpeciesId, activeSceneryId, pushHistory]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (createModalOpen && !isGenerating) {
          setCreateModalOpen(false);
          return;
        }
        if (tweaksOpen) {
          setTweaksOpen(false);
          return;
        }
      }

      if (!isInput && !createModalOpen && !comparisonSession) {
        const num = parseInt(e.key, 10);
        if (backgroundMode === 'sceneries') {
          if (num >= 1 && num <= sceneryList.length) {
            handleSelectScenery(sceneryList[num - 1].id);
          }
        } else if (num >= 1 && num <= speciesList.length) {
          handleSelectSpecies(speciesList[num - 1].id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    backgroundMode,
    createModalOpen,
    isGenerating,
    tweaksOpen,
    comparisonSession,
    speciesList,
    sceneryList,
    handleSelectSpecies,
    handleSelectScenery,
  ]);

  const handleUpdateTweak = useCallback(
    <K extends keyof CreatureTweaks>(key: K, value: CreatureTweaks[K]) => {
      setSpeciesList((prev) =>
        prev.map((sp) =>
          sp.id === activeSpecies.id
            ? { ...sp, tweaks: { ...sp.tweaks, [key]: value } }
            : sp
        )
      );
    },
    [activeSpecies.id]
  );

  const handleResetTweak = useCallback(
    (key: keyof CreatureTweaks) => {
      setSpeciesList((prev) =>
        prev.map((sp) =>
          sp.id === activeSpecies.id
            ? {
                ...sp,
                tweaks: { ...sp.tweaks, [key]: sp.defaultTweaks[key] },
              }
            : sp
        )
      );
    },
    [activeSpecies.id]
  );

  const handleResetAll = useCallback(() => {
    setSpeciesList((prev) =>
      prev.map((sp) =>
        sp.id === activeSpecies.id
          ? { ...sp, tweaks: { ...sp.defaultTweaks } }
          : sp
      )
    );
  }, [activeSpecies.id]);

  const handleUpdateSceneryTweak = useCallback(
    <K extends keyof SceneryTweaks>(key: K, value: SceneryTweaks[K]) => {
      setSceneryList((prev) =>
        prev.map((sc) =>
          sc.id === activeScenery.id
            ? { ...sc, tweaks: { ...sc.tweaks, [key]: value } }
            : sc
        )
      );
    },
    [activeScenery.id]
  );

  const handleResetSceneryTweak = useCallback(
    (key: keyof SceneryTweaks) => {
      setSceneryList((prev) =>
        prev.map((sc) =>
          sc.id === activeScenery.id
            ? {
                ...sc,
                tweaks: { ...sc.tweaks, [key]: sc.defaultTweaks[key] },
              }
            : sc
        )
      );
    },
    [activeScenery.id]
  );

  const handleResetAllScenery = useCallback(() => {
    setSceneryList((prev) =>
      prev.map((sc) =>
        sc.id === activeScenery.id
          ? { ...sc, tweaks: { ...sc.defaultTweaks } }
          : sc
      )
    );
  }, [activeScenery.id]);

  const handleGenerateVariants = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/creatures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to synthesize animal variants.');
      }

      const rawVariants = Array.isArray(data.variants) ? data.variants : [];
      if (rawVariants.length === 0) {
        throw new Error('No creature variants were returned. Please try again.');
      }

      const variants: GeneratedVariant[] = rawVariants.map(
        (v: {
          id: string;
          name: string;
          description: string;
          dotColor: string;
          blueprint: CustomCreatureBlueprint;
          motion?: Partial<CreatureTweaks>;
        }) => ({
          id: v.id,
          name: v.name,
          description: v.description,
          dotColor: v.dotColor,
          blueprint: v.blueprint,
          tweaks: {
            ...BASE_TWEAKS,
            ...(v.motion || {}),
            asciiDetail: 0.65,
            grid: 0.32,
          },
        })
      );

      setComparisonSession({
        prompt,
        speciesGroup: data.speciesGroup || prompt,
        speciesLabel: data.speciesLabel || prompt,
        variants,
      });
      setCreateModalOpen(false);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Unable to generate variants right now.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handlePickVariant = useCallback(
    (variant: GeneratedVariant) => {
      if (!comparisonSession) return;

      const archetype: MotionArchetype = variant.blueprint.archetype;
      const motionLabels =
        archetype === 'winged' || archetype === 'hover'
          ? { flutter: 'Flutter', glide: 'Glide', flapRate: 'Flap rate' }
          : archetype === 'crawler'
          ? { flutter: 'Wobble', glide: 'Pause', flapRate: 'Leg pace' }
          : { flutter: 'Undulate', glide: 'Glide', flapRate: 'Stroke rate' };

      const motionSectionLabel =
        archetype === 'winged' || archetype === 'hover'
          ? 'FLIGHT'
          : archetype === 'crawler'
          ? 'MOTION'
          : 'SWIM';

      const newId = `custom-${Date.now()}`;
      const shortName = comparisonSession.speciesLabel.slice(0, 22);

      const newSpecies: SpeciesConfig = {
        id: newId,
        name: shortName,
        dotColor: variant.dotColor,
        motionSectionLabel,
        motionLabels,
        defaultTweaks: { ...variant.tweaks },
        tweaks: { ...variant.tweaks },
        isCustom: true,
        description: `${variant.name} — ${variant.description}`,
        blueprint: variant.blueprint,
      };

      setSpeciesList((prev) => [...prev, newSpecies]);
      handleSelectSpecies(newId);
      setComparisonSession(null);
    },
    [comparisonSession, handleSelectSpecies]
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050811] select-none">
      {/* Fullscreen Live ASCII Sanctuary Canvas (Animals or Sceneries) */}
      <AsciiPondCanvas
        backgroundMode={backgroundMode}
        speciesId={activeSpecies.id}
        dotColor={activeSpecies.dotColor}
        tweaks={activeSpecies.tweaks}
        blueprint={activeSpecies.blueprint}
        sceneryId={activeScenery.id}
        sceneryTweaks={activeScenery.tweaks}
        cellSize={9}
        interactive={true}
      />

      {/* Minimalist Browser Top Bar & Stacked Background Picker */}
      {!comparisonSession && (
        <SpeciesTopBar
          backgroundMode={backgroundMode}
          onChangeBackgroundMode={handleChangeBackgroundMode}
          speciesList={speciesList}
          activeSpecies={activeSpecies}
          onSelectSpecies={handleSelectSpecies}
          sceneryList={sceneryList}
          activeScenery={activeScenery}
          onSelectScenery={handleSelectScenery}
          onOpenCreate={() => {
            setCreateInitialPrompt('');
            setGenerateError(null);
            setCreateModalOpen(true);
          }}
          tweaksOpen={tweaksOpen}
          onToggleTweaks={() => setTweaksOpen((o) => !o)}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode((z) => !z)}
          currentUrl={currentUrl}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onGoHome={handleGoHome}
          onAddressSearch={handleSubmitQuery}
        />
      )}

      {/* Center Editorial Greeting & Google Search Omnibar */}
      {!zenMode && !comparisonSession && (
        <CenterOmnibar
          userName={userName}
          onUpdateUserName={setUserName}
          attachments={attachments}
          onAddAttachment={(item) => setAttachments((prev) => [...prev, item])}
          onRemoveAttachment={(id) =>
            setAttachments((prev) => prev.filter((a) => a.id !== id))
          }
          askState={askState}
          onSubmitQuery={handleSubmitQuery}
          onClearAnswer={() => setAskState(null)}
          onCreateAnimalFromPrompt={(text) => {
            setCreateInitialPrompt(text);
            setGenerateError(null);
            setCreateModalOpen(true);
          }}
          accentColor={activeAccentColor}
        />
      )}

      {/* Right-hand Tweaks Panel */}
      {tweaksOpen && !comparisonSession && (
        <TweaksPanel
          backgroundMode={backgroundMode}
          onChangeBackgroundMode={handleChangeBackgroundMode}
          speciesList={speciesList}
          activeSpecies={activeSpecies}
          onSelectSpecies={handleSelectSpecies}
          onUpdateTweak={handleUpdateTweak}
          onResetTweak={handleResetTweak}
          onResetAll={handleResetAll}
          sceneryList={sceneryList}
          activeScenery={activeScenery}
          onSelectScenery={handleSelectScenery}
          onUpdateSceneryTweak={handleUpdateSceneryTweak}
          onResetSceneryTweak={handleResetSceneryTweak}
          onResetAllScenery={handleResetAllScenery}
          onClose={() => setTweaksOpen(false)}
        />
      )}

      {/* Describe New Animal Modal */}
      {createModalOpen && (
        <CreateAnimalModal
          initialPrompt={createInitialPrompt}
          isGenerating={isGenerating}
          error={generateError}
          onGenerate={handleGenerateVariants}
          onClose={() => setCreateModalOpen(false)}
        />
      )}

      {/* 4-Variant Side-by-Side Comparison View */}
      {comparisonSession && (
        <CompareVariantsView
          speciesGroup={comparisonSession.speciesGroup}
          speciesLabel={comparisonSession.speciesLabel}
          variants={comparisonSession.variants}
          isRegenerating={isGenerating}
          onPickVariant={handlePickVariant}
          onRegenerate={() => handleGenerateVariants(comparisonSession.prompt)}
          onBack={() => setComparisonSession(null)}
        />
      )}
    </main>
  );
}
