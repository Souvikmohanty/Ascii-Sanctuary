export type BackgroundMode = 'animals' | 'sceneries';

export type BuiltinSpeciesId =
  | 'butterfly'
  | 'koi'
  | 'jellyfish'
  | 'dragonfly'
  | 'frog'
  | 'crane'
  | 'crab';

export type BuiltinSceneryId =
  | 'sakura-moonrise'
  | 'cosmic-nebula';

export type MotionArchetype =
  | 'winged'
  | 'swimmer'
  | 'bell'
  | 'hover'
  | 'hopper'
  | 'crawler'
  | 'turtle';

export interface CreatureTweaks {
  // MOVEMENT
  general: number;
  cornerToCorner: boolean;
  direction: number;
  speed: number;
  size: number;
  amount: number;
  farFrontDepth: number;
  farBias: number;
  holdCourse: number;
  separation: number;
  // FLIGHT / MOTION
  flutter: number;
  glide: number;
  flapRate: number;
  // LOOK
  hueShift: number;
  shimmer: number;
  sparkle: number;
  distanceFade: number;
  trail: number;
  pastFade: number;
  grid: number;
  asciiDetail: number;
}

export interface SceneryTweaks {
  // ATMOSPHERE & MOTION
  tempo: number;
  wind: number;
  wave: number;
  atmosphere: number;
  // LOOK
  hueShift: number;
  shimmer: number;
  depthMist: number;
  grid: number;
  asciiDetail: number;
}

export interface SceneryConfig {
  id: BuiltinSceneryId;
  name: string;
  dotColor: string;
  subtitle: string;
  defaultTweaks: SceneryTweaks;
  tweaks: SceneryTweaks;
}

export interface CustomCreatureBlueprint {
  archetype: MotionArchetype;
  /** 4-stop color palette: [outline/deep, mid, bright, highlight/accent] */
  palette: [string, string, string, string];
  /**
   * 2 to 4 animation frames, each an array of equal-length strings (15 rows x 15 cols).
   * Characters: ' ' (empty), '.' (dim), ':' (soft), '+' (mid), '*' (bright), '#' (core), '@' (eye/accent)
   */
  frames: string[][];
}

export interface SpeciesConfig {
  id: string;
  name: string;
  dotColor: string;
  motionSectionLabel: string;
  motionLabels: {
    flutter: string;
    glide: string;
    flapRate: string;
  };
  defaultTweaks: CreatureTweaks;
  tweaks: CreatureTweaks;
  isCustom?: boolean;
  description?: string;
  blueprint?: CustomCreatureBlueprint;
}

export interface GeneratedVariant {
  id: string;
  name: string;
  description: string;
  dotColor: string;
  blueprint: CustomCreatureBlueprint;
  tweaks: CreatureTweaks;
}

export interface AttachedContextItem {
  id: string;
  type: 'tab' | 'file';
  title: string;
  content: string;
}

export interface SearchSource {
  title: string;
  url: string;
}

export interface AskResponseState {
  query: string;
  answer: string;
  sources?: SearchSource[];
  isLoading: boolean;
  error?: string;
}

export interface BrowserHistoryEntry {
  url: string;
  mode: BackgroundMode;
  speciesId: string;
  sceneryId: BuiltinSceneryId;
  query?: string;
}
