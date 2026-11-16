import { SceneryConfig, SceneryTweaks } from '../types/creature';

export const BASE_SCENERY_TWEAKS: SceneryTweaks = {
  tempo: 1.0,
  wind: 1.0,
  wave: 0.8,
  atmosphere: 0.72,
  hueShift: 0,
  shimmer: 0.45,
  depthMist: 0.42,
  grid: 0.28,
  asciiDetail: 0.62,
};

export interface SceneryTweakMeta {
  key: keyof SceneryTweaks;
  label: string;
  section: 'motion' | 'look';
  min: number;
  max: number;
  step: number;
  decimals: number;
  tooltip: string;
}

export const SCENERY_TWEAK_DEFINITIONS: SceneryTweakMeta[] = [
  {
    key: 'tempo',
    label: 'Tempo',
    section: 'motion',
    min: 0.1,
    max: 2.5,
    step: 0.05,
    decimals: 2,
    tooltip: 'Overall animation speed for sky currents, water ripples, and drifting particles. Double-click to reset.',
  },
  {
    key: 'wind',
    label: 'Wind & drift',
    section: 'motion',
    min: 0,
    max: 2.5,
    step: 0.05,
    decimals: 2,
    tooltip: 'Controls lateral breeze on petals, rain angle, aurora drift, and floating lanterns. Double-click to reset.',
  },
  {
    key: 'wave',
    label: 'Sway & waves',
    section: 'motion',
    min: 0,
    max: 2.0,
    step: 0.05,
    decimals: 2,
    tooltip: 'Amplitude of water swells, sakura branch sway, and aurora ribbons. Double-click to reset.',
  },
  {
    key: 'atmosphere',
    label: 'Particles & stars',
    section: 'motion',
    min: 0,
    max: 1.0,
    step: 0.02,
    decimals: 2,
    tooltip: 'Density of stars, falling sakura petals, rain streaks, lanterns, or seafoam glints. Double-click to reset.',
  },
  {
    key: 'hueShift',
    label: 'Hue shift (°)',
    section: 'look',
    min: 0,
    max: 360,
    step: 1,
    decimals: 0,
    tooltip: 'Rotates the entire scenery color palette around the color wheel. Double-click to reset.',
  },
  {
    key: 'shimmer',
    label: 'Shimmer',
    section: 'look',
    min: 0,
    max: 1.0,
    step: 0.02,
    decimals: 2,
    tooltip: 'Controls twinkling starlight, water surface reflections, and luminous atmospheric glow. Double-click to reset.',
  },
  {
    key: 'depthMist',
    label: 'Depth mist',
    section: 'look',
    min: 0,
    max: 1.0,
    step: 0.02,
    decimals: 2,
    tooltip: 'Blends distant ridges and horizons softly into the obsidian backdrop. Double-click to reset.',
  },
  {
    key: 'grid',
    label: 'Grid',
    section: 'look',
    min: 0,
    max: 1.0,
    step: 0.02,
    decimals: 2,
    tooltip: 'Visibility of the underlying monospace ASCII lattice across the night sky. Double-click to reset.',
  },
  {
    key: 'asciiDetail',
    label: 'ASCII detail',
    section: 'look',
    min: 0,
    max: 1.0,
    step: 0.02,
    decimals: 2,
    tooltip: 'Balances luminous mosaic tiles with crisp monospace ASCII landscape glyphs. Double-click to reset.',
  },
];

function createSceneryTweaks(overrides: Partial<SceneryTweaks>): SceneryTweaks {
  return { ...BASE_SCENERY_TWEAKS, ...overrides };
}

export const BUILTIN_SCENERIES: SceneryConfig[] = [
  {
    id: 'sakura-moonrise',
    name: 'Sakura Moonrise',
    dotColor: '#F472B6',
    subtitle: 'Full moon over blossom branches & drifting petals',
    defaultTweaks: createSceneryTweaks({
      tempo: 0.9,
      wind: 1.1,
      wave: 0.75,
      atmosphere: 0.82,
      shimmer: 0.42,
      depthMist: 0.5,
      asciiDetail: 0.58,
    }),
    tweaks: createSceneryTweaks({
      tempo: 0.9,
      wind: 1.1,
      wave: 0.75,
      atmosphere: 0.82,
      shimmer: 0.42,
      depthMist: 0.5,
      asciiDetail: 0.58,
    }),
  },
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    dotColor: '#A78BFA',
    subtitle: 'Drifting interstellar dust clouds, starlight & shooting stars',
    defaultTweaks: createSceneryTweaks({
      tempo: 0.95,
      wind: 0.8,
      wave: 0.9,
      atmosphere: 0.88,
      shimmer: 0.68,
      depthMist: 0.38,
      asciiDetail: 0.62,
    }),
    tweaks: createSceneryTweaks({
      tempo: 0.95,
      wind: 0.8,
      wave: 0.9,
      atmosphere: 0.88,
      shimmer: 0.68,
      depthMist: 0.38,
      asciiDetail: 0.62,
    }),
  },
];
