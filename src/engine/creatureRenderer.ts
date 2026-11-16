import { CreatureTweaks, CustomCreatureBlueprint } from '../types/creature';
import { hexToRgb, RGB, shiftHueRgb } from './colorUtils';

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
  color: RGB;
}

export interface CreatureAgent {
  id: number;
  x: number;
  y: number;
  z: number; // 0 (far) to 1 (front)
  angle: number; // travel heading in radians
  speedMult: number;
  currentSpeed: number;
  flapPhase: number;
  glideRemaining: number;
  flapBurstRemaining: number;
  isGliding: boolean;
  glideBlend: number; // 0 = active stroke, 1 = gliding
  turnRate: number;
  seed: number;
  variantSeed: number;
  trail: TrailPoint[];
  trailAccumulator: number;
}

export interface SparkleParticle {
  gx: number;
  gy: number;
  life: number;
  maxLife: number;
  color: RGB;
  char: string;
}

export interface RippleWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export interface CellSample {
  gx: number;
  gy: number;
  color: RGB;
  alpha: number;
  intensity: number;
  forcedChar?: string;
}

const DENSITY_CHARS = ['·', ':', '+', '*', '%', '#', '@'];

export function pickAsciiChar(intensity: number, detail: number, seed: number): string {
  if (detail <= 0.04) return '';
  const clamped = Math.max(0, Math.min(0.999, intensity));
  const idx = Math.min(
    DENSITY_CHARS.length - 1,
    Math.floor(clamped * DENSITY_CHARS.length)
  );
  if (idx >= 1 && idx <= 4 && ((seed * 17) % 10) > 7) {
    return DENSITY_CHARS[Math.min(DENSITY_CHARS.length - 1, idx + 1)];
  }
  return DENSITY_CHARS[idx];
}

function getDepthDistribution(farBias: number, r: number): number {
  return Math.pow(r, Math.max(0.25, farBias));
}

export function spawnAgent(
  id: number,
  width: number,
  height: number,
  tweaks: CreatureTweaks,
  initialScatter: boolean
): CreatureAgent {
  const z = getDepthDistribution(tweaks.farBias, Math.random());
  let x = Math.random() * width;
  let y = Math.random() * height;
  let angle = (tweaks.direction * Math.PI) / 180;

  if (tweaks.cornerToCorner) {
    if (initialScatter) {
      x = Math.random() * width;
      y = Math.random() * height;
      // Mostly sweeping diagonal flows like in a natural pond/sky
      const diag = [0.55, 2.55, -0.55, -2.55][Math.floor(Math.random() * 4)];
      angle = diag + (Math.random() - 0.5) * 0.65;
    } else {
      const cornerChoice = Math.floor(Math.random() * 4);
      const margin = 120;
      if (cornerChoice === 0) {
        x = -margin;
        y = Math.random() * height * 0.75;
        angle = 0.35 + (Math.random() - 0.5) * 0.55;
      } else if (cornerChoice === 1) {
        x = width + margin;
        y = Math.random() * height * 0.75 + height * 0.15;
        angle = Math.PI - 0.35 + (Math.random() - 0.5) * 0.55;
      } else if (cornerChoice === 2) {
        x = Math.random() * width * 0.75;
        y = -margin;
        angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.65;
      } else {
        x = Math.random() * width * 0.75 + width * 0.15;
        y = height + margin;
        angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.65;
      }
    }
  } else if (!initialScatter) {
    const dirRad = (tweaks.direction * Math.PI) / 180;
    const cos = Math.cos(dirRad);
    const sin = Math.sin(dirRad);
    if (Math.abs(cos) >= Math.abs(sin)) {
      x = cos >= 0 ? -110 : width + 110;
      y = Math.random() * height;
    } else {
      x = Math.random() * width;
      y = sin >= 0 ? -110 : height + 110;
    }
    angle = dirRad + (Math.random() - 0.5) * 0.22;
  } else {
    const dirRad = (tweaks.direction * Math.PI) / 180;
    angle = dirRad + (Math.random() - 0.5) * 0.3;
  }

  return {
    id,
    x,
    y,
    z,
    angle,
    speedMult: 0.86 + Math.random() * 0.28,
    currentSpeed: 64 * tweaks.speed,
    flapPhase: Math.random() * Math.PI * 2,
    glideRemaining: Math.random() * 1.1,
    flapBurstRemaining: 1.1 + Math.random() * 1.6,
    isGliding: false,
    glideBlend: 0,
    turnRate: 0,
    seed: Math.random() * 1000,
    variantSeed: Math.floor(Math.random() * 100),
    trail: [],
    trailAccumulator: 0,
  };
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function stepAgents(
  agents: CreatureAgent[],
  sparkles: SparkleParticle[],
  width: number,
  height: number,
  dt: number,
  tweaks: CreatureTweaks,
  speciesId: string,
  cellSize: number,
  pointer: { x: number; y: number; active: boolean },
  baseColorHex: string,
  elapsed: number
): void {
  const desiredCount = Math.max(1, Math.min(75, Math.round(tweaks.amount)));
  while (agents.length < desiredCount) {
    agents.push(spawnAgent(Date.now() + Math.random(), width, height, tweaks, true));
  }
  if (agents.length > desiredCount) {
    agents.length = desiredCount;
  }

  const timeScale = tweaks.general;
  const effDt = Math.min(0.05, dt) * timeScale;
  const sepRadius = tweaks.separation;

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];

    // Smooth Glide vs Active Stroke state machine
    if (tweaks.glide > 0.05) {
      if (a.glideRemaining > 0) {
        a.isGliding = true;
        a.glideRemaining -= effDt;
        if (a.glideRemaining <= 0) {
          a.isGliding = false;
          a.flapBurstRemaining =
            speciesId === 'crane'
              ? 1.7 + Math.random() * 1.6
              : speciesId === 'butterfly'
              ? 1.3 + Math.random() * 1.5
              : 1.0 + Math.random() * 1.4;
        }
      } else {
        a.isGliding = false;
        a.flapBurstRemaining -= effDt;
        if (a.flapBurstRemaining <= 0) {
          a.glideRemaining = (0.4 + Math.random() * 0.8) * tweaks.glide * 0.5;
        }
      }
    } else {
      a.isGliding = false;
    }

    const targetBlend = a.isGliding ? 1 : 0;
    a.glideBlend += (targetBlend - a.glideBlend) * Math.min(1, effDt * 3.8);

    // Calm, natural cadence
    const activePhaseSpeed =
      speciesId === 'dragonfly'
        ? 11.0
        : speciesId === 'butterfly'
        ? 5.0
        : speciesId === 'crane'
        ? 3.4
        : speciesId === 'jellyfish'
        ? 2.9
        : speciesId === 'frog'
        ? 3.6
        : speciesId === 'crab'
        ? 7.2
        : 4.8;

    const glidePhaseMult = speciesId === 'dragonfly' ? 1.15 : 0.12;
    const phaseRate =
      activePhaseSpeed * (1 - a.glideBlend * (1 - glidePhaseMult));
    a.flapPhase += effDt * tweaks.flapRate * phaseRate;

    // Wide, sweeping organic steering (smoothly integrated into turnRate — zero jerks!)
    const holdFactor = 1 / Math.max(0.4, tweaks.holdCourse);
    const flowWave =
      Math.sin(elapsed * 0.36 + a.seed) * 0.65 +
      Math.sin(elapsed * 0.17 + a.seed * 2.17) * 0.45;

    let desiredTurnRate = 0;

    if (tweaks.cornerToCorner) {
      const turnAmp =
        speciesId === 'butterfly'
          ? 0.68
          : speciesId === 'dragonfly'
          ? 0.75
          : speciesId === 'crane'
          ? 0.22
          : speciesId === 'koi'
          ? 0.42
          : 0.38;
      desiredTurnRate = flowWave * turnAmp * holdFactor;
    } else {
      const baseDir = (tweaks.direction * Math.PI) / 180;
      const desiredAngle = baseDir + flowWave * 0.24 * holdFactor;
      const diff = normalizeAngle(desiredAngle - a.angle);
      desiredTurnRate = diff * (1.1 + tweaks.holdCourse * 0.7);
    }

    // Smooth separation steering blended into turnRate (no sudden angle snaps!)
    if (sepRadius > 10) {
      let pushX = 0;
      let pushY = 0;
      const sepSq = (sepRadius * 0.28) ** 2;
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;
        const b = agents[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dSq = dx * dx + dy * dy;
        if (dSq > 1 && dSq < sepSq) {
          const dist = Math.sqrt(dSq);
          const force = 1 - dist / Math.sqrt(sepSq);
          pushX += (dx / dist) * force;
          pushY += (dy / dist) * force;
        }
      }
      if (pushX !== 0 || pushY !== 0) {
        const avoidAngle = Math.atan2(pushY, pushX);
        const diff = normalizeAngle(avoidAngle - a.angle);
        desiredTurnRate += diff * 1.4;
      }
    }

    // Smooth pointer avoidance blended into turnRate
    if (pointer.active) {
      const dx = a.x - pointer.x;
      const dy = a.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d > 14 && d < 135) {
        const away = Math.atan2(dy, dx);
        const diff = normalizeAngle(away - a.angle);
        desiredTurnRate += diff * (2.6 * (1 - d / 135));
      }
    }

    // Clamp max angular velocity for natural turning radius
    const maxTurn = speciesId === 'dragonfly' ? 2.4 : speciesId === 'crane' ? 0.9 : 1.5;
    const clampedTurn = Math.max(-maxTurn, Math.min(maxTurn, desiredTurnRate));
    a.turnRate += (clampedTurn - a.turnRate) * Math.min(1, effDt * 3.2);
    a.angle = normalizeAngle(a.angle + a.turnRate * effDt);

    // Species-authentic momentum & propulsion physics
    const depthScale = 1 - tweaks.farFrontDepth * 0.52 * (1 - a.z);
    const baseCruise = 74 * tweaks.speed * a.speedMult * depthScale;
    let targetSpeed = baseCruise;

    if (speciesId === 'butterfly') {
      // Smooth aerodynamic pulse: power downstroke pushes forward, glide coasts cleanly
      const rawSin = Math.sin(a.flapPhase);
      const downstroke = Math.pow(Math.max(0, rawSin), 1.4);
      targetSpeed =
        baseCruise * ((0.74 + 0.48 * downstroke) * (1 - a.glideBlend) + 0.92 * a.glideBlend);
    } else if (speciesId === 'koi') {
      // Steady graceful pond cruising with gentle tail-beat surge
      targetSpeed = baseCruise * (0.92 + 0.12 * Math.sin(a.flapPhase * 0.5));
    } else if (speciesId === 'jellyfish') {
      // Smooth bell-contraction burst -> tranquil drift
      const contraction = Math.pow(Math.max(0, Math.sin(a.flapPhase)), 2.0);
      targetSpeed = baseCruise * ((0.26 + 1.25 * contraction) * (1 - a.glideBlend * 0.5));
    } else if (speciesId === 'dragonfly') {
      targetSpeed = baseCruise * (1.36 * (1 - a.glideBlend) + 0.08 * a.glideBlend);
    } else if (speciesId === 'frog') {
      // Explosive kick -> long smooth coasting deceleration
      const kick = Math.pow(Math.max(0, Math.sin(a.flapPhase)), 2.2);
      targetSpeed = baseCruise * ((0.3 + 1.55 * kick) * (1 - a.glideBlend * 0.55));
    } else if (speciesId === 'crane') {
      targetSpeed = baseCruise * (0.94 + 0.14 * a.glideBlend);
    } else if (speciesId === 'crab') {
      targetSpeed = baseCruise * (1.16 * (1 - a.glideBlend) + 0.06 * a.glideBlend);
    }

    const inertia =
      speciesId === 'dragonfly'
        ? 4.6
        : speciesId === 'frog' || speciesId === 'jellyfish'
        ? 3.4
        : 2.4;
    a.currentSpeed += (targetSpeed - a.currentSpeed) * Math.min(1, effDt * inertia);

    // Only butterflies have subtle aerodynamic vertical/lateral flutter; fish/birds travel cleanly along heading!
    const lateralSpeed =
      speciesId === 'butterfly'
        ? Math.sin(a.flapPhase * 0.5 + a.seed) * tweaks.flutter * 14 * (1 - a.glideBlend * 0.8)
        : 0;

    const vx = (Math.cos(a.angle) * a.currentSpeed - Math.sin(a.angle) * lateralSpeed) * effDt;
    const vy = (Math.sin(a.angle) * a.currentSpeed + Math.cos(a.angle) * lateralSpeed) * effDt;

    a.x += vx;
    a.y += vy;

    // Wrap / Respawn smoothly outside viewport bounds
    const pad = 160;
    if (a.x < -pad || a.x > width + pad || a.y < -pad || a.y > height + pad) {
      if (tweaks.cornerToCorner) {
        if (a.x < -pad) a.x = width + pad * 0.75;
        else if (a.x > width + pad) a.x = -pad * 0.75;
        if (a.y < -pad) a.y = height + pad * 0.75;
        else if (a.y > height + pad) a.y = -pad * 0.75;
        a.trail = [];
      } else {
        const respawned = spawnAgent(a.id, width, height, tweaks, false);
        a.x = respawned.x;
        a.y = respawned.y;
        a.angle = respawned.angle;
        a.z = respawned.z;
        a.trail = [];
      }
    }

    // Trail recording
    a.trailAccumulator += effDt;
    if (tweaks.trail > 0.05 && a.trailAccumulator >= 0.04) {
      a.trailAccumulator = 0;
      const baseRgb = shiftHueRgb(hexToRgb(baseColorHex), tweaks.hueShift);
      a.trail.unshift({
        x: a.x,
        y: a.y,
        age: 0,
        color: baseRgb,
      });
    }

    const maxTrailLen = Math.round(tweaks.trail * 22);
    const decaySpeed = 0.55 + tweaks.pastFade * 2.2;
    for (let t = a.trail.length - 1; t >= 0; t--) {
      a.trail[t].age += effDt * decaySpeed;
      if (t >= maxTrailLen || a.trail[t].age >= 1.2) {
        a.trail.splice(t, 1);
      }
    }

    // Sparkle emission
    if (tweaks.sparkle > 0.03 && Math.random() < tweaks.sparkle * 0.36 * timeScale) {
      const spread = 36 * tweaks.size * depthScale;
      const sx = a.x + (Math.random() - 0.5) * spread;
      const sy = a.y + (Math.random() - 0.5) * spread;
      const baseRgb = shiftHueRgb(hexToRgb(baseColorHex), tweaks.hueShift);
      sparkles.push({
        gx: Math.round(sx / cellSize),
        gy: Math.round(sy / cellSize),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.55,
        color: {
          r: Math.min(255, baseRgb.r + 80),
          g: Math.min(255, baseRgb.g + 80),
          b: Math.min(255, baseRgb.b + 80),
        },
        char: Math.random() > 0.5 ? '*' : '+',
      });
    }
  }

  for (let s = sparkles.length - 1; s >= 0; s--) {
    sparkles[s].life += effDt;
    if (sparkles[s].life >= sparkles[s].maxLife) {
      sparkles.splice(s, 1);
    }
  }
}

const PALETTES = {
  // Luminous Morpho Azure + Monarch Amber matching the rich backlit video aesthetic
  morpho: [
    hexToRgb('#1E3A8A'), // 0: deep cobalt wing edge & veins
    hexToRgb('#2563EB'), // 1: royal blue outer wing
    hexToRgb('#38BDF8'), // 2: electric cyan inner wing glow
    hexToRgb('#F0F9FF'), // 3: luminous white spots & core
  ],
  monarch: [
    hexToRgb('#7C2D12'), // 0: rich dark mahogany wing border & veins
    hexToRgb('#EA580C'), // 1: monarch tangerine orange
    hexToRgb('#FBBF24'), // 2: golden amber inner wing
    hexToRgb('#FFFBEB'), // 3: pearl white marginal spots
  ],
  koi: [
    hexToRgb('#F8FAFC'), // 0: pearl white scales
    hexToRgb('#EF4444'), // 1: vivid koi crimson-vermilion
    hexToRgb('#F59E0B'), // 2: kohaku amber gold
    hexToRgb('#334155'), // 3: sumi ink slate markings & eyes
  ],
  jellyfish: [
    hexToRgb('#7E22CE'), // 0: deep amethyst tentacles
    hexToRgb('#C026D3'), // 1: translucent violet bell
    hexToRgb('#F0ABFC'), // 2: luminous scalloped rim
    hexToRgb('#FDF4FF'), // 3: glowing inner core
  ],
  dragonfly: [
    hexToRgb('#065F46'), // 0: dark jade wingtips & abdomen bands
    hexToRgb('#10B981'), // 1: emerald thorax
    hexToRgb('#34D399'), // 2: luminous mint-teal sheen
    hexToRgb('#E0F2FE'), // 3: gossamer wing veins & compound eyes
  ],
  frog: [
    hexToRgb('#15803D'), // 0: moss shadow & legs
    hexToRgb('#22C55E'), // 1: pond leaf green
    hexToRgb('#86EFAC'), // 2: bright lime dorsal ridge
    hexToRgb('#FACC15'), // 3: golden eyes
  ],
  crane: [
    hexToRgb('#475569'), // 0: charcoal wingtips, beak & trailing legs
    hexToRgb('#CBD5E1'), // 1: soft silver-grey wing shading
    hexToRgb('#F8FAFC'), // 2: snowy white plumage
    hexToRgb('#EF4444'), // 3: crimson crown
  ],
  crab: [
    hexToRgb('#9A3412'), // 0: deep terracotta rim & leg joints
    hexToRgb('#EA580C'), // 1: vermilion shell
    hexToRgb('#FB923C'), // 2: bright coral highlights & claws
    hexToRgb('#FEF3C7'), // 3: cream eye stalks & claw tips
  ],
};

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { dist: number; t: number } {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq > 0.0001 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq)) : 0;
  const cx = ax + vx * t;
  const cy = ay + vy * t;
  return { dist: Math.hypot(px - cx, py - cy), t };
}

/**
 * High-Presence Inverse SDF Grid Rasterizer:
 * Generates large, luminous, hole-free creature silhouettes (~12-18 cells across)
 * with smooth outer glow halos and crisp anatomical detail at any rotation.
 */
export function sampleCreatureCells(
  agent: CreatureAgent,
  speciesId: string,
  tweaks: CreatureTweaks,
  cellSize: number,
  time: number,
  blueprint?: CustomCreatureBlueprint
): CellSample[] {
  const depthScale = 1 - tweaks.farFrontDepth * 0.54 * (1 - agent.z);
  // Generous 1.38x spatial multiplier so foreground creatures match the bold presence of the reference
  const scalePx = cellSize * 1.38 * tweaks.size * depthScale;
  const baseAlpha = Math.max(0.24, 1 - tweaks.distanceFade * 0.62 * (1 - agent.z));

  const bodyAngleOffset = speciesId === 'crab' ? 0 : Math.PI / 2;
  const rot = agent.angle + bodyAngleOffset;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  const shift = (rgb: RGB): RGB => shiftHueRgb(rgb, tweaks.hueShift);

  const localRadius = speciesId === 'crane' || speciesId === 'jellyfish' || speciesId === 'koi' ? 9.5 : 8.5;
  const pxRadius = localRadius * scalePx + cellSize;
  const minGx = Math.floor((agent.x - pxRadius) / cellSize);
  const maxGx = Math.ceil((agent.x + pxRadius) / cellSize);
  const minGy = Math.floor((agent.y - pxRadius) / cellSize);
  const maxGy = Math.ceil((agent.y + pxRadius) / cellSize);

  const result: CellSample[] = [];

  const isCustom = Boolean(blueprint && blueprint.frames.length > 0);
  const customPal = isCustom && blueprint ? blueprint.palette.map((h) => shift(hexToRgb(h))) : null;
  const customFrame =
    isCustom && blueprint
      ? blueprint.frames[
          Math.min(
            blueprint.frames.length - 1,
            Math.max(0, Math.floor((Math.sin(agent.flapPhase) * 0.5 + 0.5) * (blueprint.frames.length - 0.01)))
          )
        ]
      : null;

  const bPal =
    speciesId === 'butterfly'
      ? PALETTES.morpho.map(shift)
      : speciesId === 'koi'
      ? PALETTES.koi.map(shift)
      : speciesId === 'jellyfish'
      ? PALETTES.jellyfish.map(shift)
      : speciesId === 'dragonfly'
      ? PALETTES.dragonfly.map(shift)
      : speciesId === 'frog'
      ? PALETTES.frog.map(shift)
      : speciesId === 'crane'
      ? PALETTES.crane.map(shift)
      : PALETTES.crab.map(shift);

  // Asymmetric natural butterfly wingbeat (smooth wide open -> crisp fold -> graceful rebound)
  const wingCycle = Math.cos(agent.flapPhase);
  const butterflyWingOpen =
    0.26 + 0.74 * ((0.5 + 0.5 * wingCycle) * (1 - agent.glideBlend) + 0.92 * agent.glideBlend);
  const craneWingOpen =
    0.58 + 0.42 * (Math.abs(Math.cos(agent.flapPhase)) * (1 - agent.glideBlend) + 0.92 * agent.glideBlend);
  const craneBeat = Math.cos(agent.flapPhase) * (1 - agent.glideBlend) + 0.2 * agent.glideBlend;
  const jellyPulse = Math.sin(agent.flapPhase) * (1 - agent.glideBlend * 0.65);
  const frogKick = Math.max(0, Math.sin(agent.flapPhase)) * (1 - aGlide(agent));
  const crabScuttle = Math.sin(agent.flapPhase * 1.4) * (1 - agent.glideBlend);

  for (let gy = minGy; gy <= maxGy; gy++) {
    const wy = gy * cellSize + cellSize * 0.5;
    const dy = wy - agent.y;
    for (let gx = minGx; gx <= maxGx; gx++) {
      const wx = gx * cellSize + cellSize * 0.5;
      const dx = wx - agent.x;

      const lx = (dx * cosR + dy * sinR) / scalePx;
      const ly = (-dx * sinR + dy * cosR) / scalePx;

      let sampleColor: RGB | null = null;
      let sampleAlpha = baseAlpha;
      let sampleIntensity = 0.7;
      let forcedChar: string | undefined;

      if (isCustom && customFrame && customPal && blueprint) {
        const rows = customFrame.length;
        const cols = customFrame[0]?.length || 15;
        const wingSquash =
          blueprint.archetype === 'winged'
            ? 0.45 + 0.55 * Math.abs(Math.cos(agent.flapPhase))
            : 1.0;

        let sampleLx = lx / wingSquash;
        if (blueprint.archetype === 'swimmer') {
          const normR = (ly / 0.72 + (rows - 1) / 2) / rows;
          sampleLx -= Math.sin(agent.flapPhase - normR * 4.0) * Math.max(0, normR) * 1.1;
        }
        const colF = sampleLx / 0.72 + (cols - 1) / 2;
        const rowF = ly / 0.72 + (rows - 1) / 2;
        const r = Math.round(rowF);
        const c = Math.round(colF);
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          const ch = customFrame[r][c];
          if (ch && ch !== ' ') {
            if (ch === '.') {
              sampleColor = customPal[0];
              sampleIntensity = 0.35;
            } else if (ch === ':') {
              sampleColor = customPal[0];
              sampleIntensity = 0.48;
            } else if (ch === '+') {
              sampleColor = customPal[1];
              sampleIntensity = 0.65;
            } else if (ch === '*') {
              sampleColor = customPal[2];
              sampleIntensity = 0.85;
            } else if (ch === '#') {
              sampleColor = customPal[2];
              sampleIntensity = 0.95;
            } else if (ch === '@') {
              sampleColor = customPal[3];
              sampleIntensity = 1.0;
              forcedChar = '@';
            }
          }
        }
      } else if (speciesId === 'butterfly') {
        const ax = Math.abs(lx);

        // Segmented Head, Thorax & Abdomen
        const inHead = Math.hypot(lx, ly + 2.6) < 0.6;
        const inThorax = ax < 0.56 && ly >= -2.1 && ly <= -0.1;
        const inAbdomen = ax < 0.34 && ly > -0.1 && ly <= 2.9;

        // Club-tipped Antennae
        const antSeg = distToSegment(ax, ly, 0.32, -2.9, 1.7 * Math.max(0.6, butterflyWingOpen), -4.6);
        const inAntenna = antSeg.dist < 0.32;

        // Swept Forewing (upper wide wing)
        const wxNorm = ax / Math.max(0.28, butterflyWingOpen);
        const fx = (wxNorm - 3.5) * 0.92 + (ly + 1.3) * 0.38;
        const fy = -(wxNorm - 3.5) * 0.38 + (ly + 1.3) * 0.92;
        const foreDist = Math.hypot(fx / 3.35, fy / 1.9);

        // Rounded Hindwing (lower lobe separated by waist notch)
        const hx = (wxNorm - 2.55) * 0.96 - (ly - 1.65) * 0.25;
        const hy = (wxNorm - 2.55) * 0.25 + (ly - 1.65) * 0.96;
        const hindDist = Math.hypot(hx / 2.35, hy / 1.8);

        const inForewing = wxNorm > 0.42 && foreDist <= 1.0;
        const inHindwing = wxNorm > 0.38 && hindDist <= 1.0;
        const inHalo = !inForewing && !inHindwing && wxNorm > 0.38 && (foreDist <= 1.18 || hindDist <= 1.18);

        if (inHead) {
          sampleColor = bPal[3];
          sampleIntensity = 1.0;
          forcedChar = '@';
        } else if (inThorax || inAbdomen) {
          sampleColor = bPal[0];
          sampleIntensity = 0.92;
          forcedChar = inThorax ? '#' : '|';
        } else if (inAntenna) {
          sampleColor = antSeg.t > 0.78 ? bPal[2] : bPal[0];
          sampleIntensity = antSeg.t > 0.78 ? 0.9 : 0.6;
          forcedChar = antSeg.t > 0.78 ? 'o' : lx < 0 ? '/' : '\\';
        } else if (inForewing) {
          const isBorder = foreDist > 0.76;
          const isOuterSpot =
            foreDist > 0.78 && Math.abs(Math.atan2(fy, fx) * 3.5) % 1.2 < 0.45;
          const isVein =
            !isBorder && (Math.abs(fy) < 0.25 || Math.abs(fy - fx * 0.32) < 0.2);

          if (isOuterSpot) {
            sampleColor = bPal[3];
            sampleIntensity = 1.0;
            forcedChar = '*';
          } else if (isBorder || isVein) {
            sampleColor = bPal[0];
            sampleIntensity = 0.58;
          } else {
            sampleColor = foreDist < 0.45 ? bPal[3] : foreDist < 0.66 ? bPal[2] : bPal[1];
            sampleIntensity = foreDist < 0.45 ? 0.95 : 0.8;
          }
        } else if (inHindwing) {
          const isBorder = hindDist > 0.74;
          const isSpot =
            hindDist > 0.76 && Math.abs(Math.atan2(hy, hx) * 3.0) % 1.2 < 0.42;
          const isVein = !isBorder && Math.abs(hx * 0.4 - hy) < 0.2;

          if (isSpot) {
            sampleColor = bPal[3];
            sampleIntensity = 0.96;
          } else if (isBorder || isVein) {
            sampleColor = bPal[0];
            sampleIntensity = 0.54;
          } else {
            sampleColor = hindDist < 0.48 ? bPal[2] : bPal[1];
            sampleIntensity = 0.78;
          }
        } else if (inHalo) {
          // Soft bioluminescent aura around wings (just like 00:01 & 00:28!)
          sampleColor = bPal[1];
          sampleAlpha = baseAlpha * 0.26;
          sampleIntensity = 0.25;
          forcedChar = '·';
        }
      } else if (speciesId === 'koi') {
        // Long sinuous Koi (ly from -5.6 snout to +6.4 tail tip)
        const t = (ly + 5.6) / 12.0;
        if (t >= -0.06 && t <= 1.06) {
          const clampedT = Math.max(0, Math.min(1, t));
          const spineX =
            Math.sin(agent.flapPhase - clampedT * 4.2) *
            (0.28 + clampedT * 1.65) *
            (0.55 + tweaks.flutter * 0.45);
          const distFromSpine = Math.abs(lx - spineX);

          const bodyHalfW =
            clampedT < 0.18
              ? 0.62 + Math.sin((clampedT / 0.18) * (Math.PI * 0.5)) * 1.18
              : clampedT < 0.74
              ? 1.8 * (1 - ((clampedT - 0.18) / 0.56) * 0.74)
              : 0.46 + ((clampedT - 0.74) / 0.26) * 1.75;

          const inTailFork = clampedT > 0.84 && distFromSpine < (clampedT - 0.84) * 3.6;

          const pecSeg = distToSegment(Math.abs(lx - spineX), ly, 1.2, -2.1, 3.2, -0.5);
          const inPectoral = pecSeg.dist < 0.66;
          const pelvSeg = distToSegment(Math.abs(lx - spineX), ly, 0.75, 0.9, 1.9, 2.0);
          const inPelvic = pelvSeg.dist < 0.44;
          const barbel = distToSegment(Math.abs(lx - spineX), ly, 0.65, -5.3, 1.35, -6.0);
          const inBarbel = barbel.dist < 0.25;
          const inEye = Math.hypot(Math.abs(lx - spineX) - 0.95, ly + 4.15) < 0.44;

          if (inEye) {
            sampleColor = bPal[3];
            sampleIntensity = 1.0;
            forcedChar = '@';
          } else if (t >= 0 && t <= 1 && distFromSpine <= bodyHalfW && !inTailFork) {
            const patternType = agent.variantSeed % 3;
            const isDorsal = distFromSpine < 0.34 && clampedT > 0.2 && clampedT < 0.68;

            if (clampedT > 0.74) {
              sampleColor = patternType === 2 ? bPal[2] : bPal[0];
              sampleAlpha = baseAlpha * 0.75;
              sampleIntensity = 0.48;
            } else if (patternType === 0) {
              const patch = Math.sin(clampedT * 10.5 + (lx - spineX) * 0.8 + agent.variantSeed) > -0.05;
              sampleColor = patch ? bPal[1] : bPal[0];
              sampleIntensity = isDorsal ? 0.98 : 0.84;
            } else if (patternType === 1) {
              const p1 = Math.sin(clampedT * 8.5 + agent.variantSeed) > 0.0;
              const p2 = Math.cos(clampedT * 13.5 + (lx - spineX) * 2.2 + agent.variantSeed) > 0.66;
              sampleColor = p2 ? bPal[3] : p1 ? bPal[1] : bPal[0];
              sampleIntensity = isDorsal ? 0.96 : 0.84;
            } else {
              sampleColor = distFromSpine < 0.8 ? bPal[1] : bPal[2];
              sampleIntensity = isDorsal ? 0.98 : 0.85;
            }
          } else if (inPectoral || inPelvic) {
            sampleColor = agent.variantSeed % 3 === 2 ? bPal[2] : bPal[0];
            sampleAlpha = baseAlpha * 0.68;
            sampleIntensity = 0.42;
          } else if (inBarbel) {
            sampleColor = bPal[0];
            sampleAlpha = baseAlpha * 0.8;
            sampleIntensity = 0.4;
            forcedChar = '~';
          }
        }
      } else if (speciesId === 'jellyfish') {
        const bellW = 3.6 - jellyPulse * 0.82;
        const bellH = 2.8 + jellyPulse * 0.42;
        const by = ly + 1.8;
        const inDome =
          by >= -bellH &&
          by <= 0.45 &&
          Math.abs(lx) <= bellW * Math.sqrt(Math.max(0, 1 - Math.min(0, by / bellH) ** 2));

        if (inDome) {
          const ny = (by + bellH) / (bellH + 0.45);
          const normR = Math.abs(lx) / Math.max(0.4, bellW);
          const isRim = ny > 0.78 || normR > 0.84;
          const isInnerCore = ny > 0.25 && ny < 0.65 && normR < 0.44;
          sampleColor = isInnerCore ? bPal[3] : isRim ? bPal[2] : bPal[1];
          sampleAlpha = baseAlpha * (isInnerCore || isRim ? 0.96 : 0.7);
          sampleIntensity = isInnerCore ? 1.0 : isRim ? 0.88 : 0.56;
        } else if (ly > -1.2 && ly < 7.5) {
          const tentOffsets = [-2.2, -1.1, 0, 1.1, 2.2];
          let minTentDist = 99;
          let hitIdx = -1;
          for (let ti = 0; ti < tentOffsets.length; ti++) {
            const maxLen = ti === 2 ? 7.4 : ti % 2 === 1 ? 6.2 : 5.0;
            if (ly > maxLen) continue;
            const waveX =
              tentOffsets[ti] * (0.72 + (1 - jellyPulse) * 0.24) +
              Math.sin(agent.flapPhase * 0.85 - ly * 0.72 + ti * 1.2) * 0.72;
            const d = Math.abs(lx - waveX);
            if (d < minTentDist) {
              minTentDist = d;
              hitIdx = ti;
            }
          }
          const isOral = hitIdx >= 1 && hitIdx <= 3 && ly < 3.2;
          if (minTentDist < (isOral ? 0.45 : 0.34)) {
            const fade = Math.max(0.25, 1 - (ly + 1.2) / 8.8);
            sampleColor = isOral ? bPal[2] : bPal[0];
            sampleAlpha = baseAlpha * fade * (isOral ? 0.9 : 0.78);
            sampleIntensity = isOral ? 0.76 : 0.48;
          }
        }
      } else if (speciesId === 'dragonfly') {
        const ax = Math.abs(lx);
        const wingShimmer = 0.85 + 0.15 * Math.sin(agent.flapPhase * 1.5);

        const inEye = Math.hypot(ax - 0.68, ly + 4.1) < 0.54;
        const inThorax = Math.hypot(lx / 0.9, (ly + 2.5) / 1.2) <= 1.0;
        const inAbdomen = ax < 0.34 && ly >= -1.4 && ly <= 5.6;
        const inClasper = distToSegment(ax, ly, 0.1, 5.6, 0.6, 6.4).dist < 0.26;

        const foreSeg = distToSegment(ax, ly, 0.62, -2.5, 6.2 * wingShimmer, -3.4);
        const inForewing = foreSeg.dist < 0.68 * (0.55 + 0.45 * Math.sin(foreSeg.t * Math.PI));

        const hindSeg = distToSegment(ax, ly, 0.62, -1.6, 5.6 * wingShimmer, 0.15);
        const inHindwing = hindSeg.dist < 0.64 * (0.55 + 0.45 * Math.sin(hindSeg.t * Math.PI));

        if (inEye) {
          sampleColor = bPal[3];
          sampleIntensity = 1.0;
          forcedChar = '@';
        } else if (inThorax) {
          sampleColor = bPal[1];
          sampleIntensity = 0.92;
          forcedChar = '#';
        } else if (inAbdomen) {
          const band = Math.floor((ly + 2) * 1.8) % 2 === 0;
          sampleColor = band ? bPal[2] : bPal[0];
          sampleIntensity = band ? 0.85 : 0.62;
          forcedChar = '|';
        } else if (inClasper) {
          sampleColor = bPal[0];
          sampleIntensity = 0.5;
        } else if (inForewing || inHindwing) {
          const t = inForewing ? foreSeg.t : hindSeg.t;
          const isStigma = t > 0.84;
          sampleColor = isStigma ? bPal[0] : bPal[3];
          sampleAlpha = baseAlpha * (isStigma ? 0.92 : 0.72);
          sampleIntensity = isStigma ? 0.78 : 0.48;
        }
      } else if (speciesId === 'frog') {
        const ax = Math.abs(lx);
        const torsoW = ly < -1.0 ? 1.5 - Math.abs(ly + 1.0) * 0.45 : 1.7 - Math.max(0, ly - 0.5) * 0.32;
        const inTorso = ly >= -3.1 && ly <= 2.0 && ax <= Math.max(0.4, torsoW);
        const inEye = Math.hypot(ax - 1.0, ly + 2.2) < 0.48;

        const arm1 = distToSegment(ax, ly, 1.25, -1.3, 2.5, -1.9);
        const arm2 = distToSegment(ax, ly, 2.5, -1.9, 2.3, -2.6);
        const inArm = arm1.dist < 0.4 || arm2.dist < 0.34;

        const kneeX = 2.6 - frogKick * 0.75;
        const kneeY = 1.2 + frogKick * 1.1;
        const ankleX = 1.7 + frogKick * 0.75;
        const ankleY = 2.3 + frogKick * 2.2;
        const footX = 2.3 + frogKick * 1.05;
        const footY = 2.8 + frogKick * 3.0;

        const thigh = distToSegment(ax, ly, 1.05, 1.4, kneeX, kneeY);
        const shin = distToSegment(ax, ly, kneeX, kneeY, ankleX, ankleY);
        const foot = distToSegment(ax, ly, ankleX, ankleY, footX, footY);
        const inLeg = thigh.dist < 0.48 || shin.dist < 0.42 || foot.dist < 0.45;

        if (inEye) {
          sampleColor = bPal[3];
          sampleIntensity = 1.0;
          forcedChar = '@';
        } else if (inTorso) {
          const isSpine = ax < 0.4;
          const isSpot = !isSpine && Math.sin(ly * 3.1 + ax * 2.4) > 0.55;
          sampleColor = isSpine ? bPal[2] : isSpot ? bPal[0] : bPal[1];
          sampleIntensity = isSpine ? 0.92 : 0.76;
        } else if (inArm || inLeg) {
          sampleColor = foot.dist < 0.45 ? bPal[2] : bPal[0];
          sampleIntensity = 0.68;
        }
      } else if (speciesId === 'crane') {
        const ax = Math.abs(lx);
        const inBeak = ax < 0.26 && ly >= -6.4 && ly < -5.1;
        const inCrown = ax < 0.45 && ly >= -5.1 && ly < -4.2;
        const inNeck = ax < 0.36 && ly >= -4.2 && ly < -1.2;
        const inTorso = Math.hypot(lx / 1.0, (ly - 0.4) / 1.8) <= 1.0;
        const inLegs = Math.abs(ax - 0.5) < 0.26 && ly >= 2.1 && ly <= 5.8;

        const span = 6.6 * craneWingOpen;
        const wingSweepY = -0.8 + (ax / Math.max(0.5, span)) * 2.7 - craneBeat * (ax / Math.max(0.5, span)) * 1.15;
        const wingThick = 1.95 * (1 - (ax / Math.max(0.5, span)) * 0.68);
        const inWing =
          ax >= 0.55 &&
          ax <= span &&
          ly >= wingSweepY &&
          ly <= wingSweepY + wingThick;

        if (inCrown) {
          sampleColor = bPal[3];
          sampleIntensity = 1.0;
          forcedChar = '@';
        } else if (inBeak || inLegs) {
          sampleColor = bPal[0];
          sampleIntensity = 0.65;
        } else if (inNeck || inTorso) {
          sampleColor = ax < 0.42 ? bPal[2] : bPal[1];
          sampleIntensity = 0.92;
        } else if (inWing) {
          const normSpan = ax / Math.max(0.5, span);
          const isPrimaryTip = normSpan > 0.74 || ly > wingSweepY + wingThick - 0.45;
          sampleColor = isPrimaryTip ? bPal[0] : ly < wingSweepY + 0.72 ? bPal[2] : bPal[1];
          sampleIntensity = isPrimaryTip ? 0.58 : 0.9;
        }
      } else if (speciesId === 'crab') {
        const ax = Math.abs(lx);
        const shellDist = Math.hypot(lx / 2.75, (ly - 0.1) / 2.0);
        const inCarapace = shellDist <= 1.0;
        const stalk = distToSegment(ax, ly, 0.82, -1.75, 0.96, -2.65);
        const inEye = Math.hypot(ax - 0.96, ly + 2.75) < 0.42;

        const snap = Math.sin(agent.flapPhase * 1.2) * 0.35;
        const clawArm = distToSegment(ax, ly, 2.1, -1.5, 3.2, -2.7);
        const clawPinchA = distToSegment(ax, ly, 3.2, -2.7, 3.1, -3.8 + snap);
        const clawPinchB = distToSegment(ax, ly, 3.2, -2.7, 2.1, -3.6 - snap);
        const inClaw = clawArm.dist < 0.46 || clawPinchA.dist < 0.36 || clawPinchB.dist < 0.34;

        let inLeg = false;
        let isLegTip = false;
        for (let leg = 0; leg < 3; leg++) {
          const phase = leg % 2 === 0 ? crabScuttle : -crabScuttle;
          const y0 = -0.6 + leg * 1.15;
          const y1 = y0 + phase * 0.42;
          const upper = distToSegment(ax, ly, 2.4, y0, 3.8, y1 + 0.24);
          const lower = distToSegment(ax, ly, 3.8, y1 + 0.24, 4.55, y1 + 1.05);
          if (upper.dist < 0.38 || lower.dist < 0.34) {
            inLeg = true;
            if (lower.t > 0.6) isLegTip = true;
            break;
          }
        }

        if (inEye) {
          sampleColor = bPal[3];
          sampleIntensity = 1.0;
          forcedChar = '@';
        } else if (stalk.dist < 0.26) {
          sampleColor = bPal[0];
          sampleIntensity = 0.7;
        } else if (inCarapace) {
          const isRim = shellDist > 0.78;
          sampleColor = isRim ? bPal[0] : shellDist < 0.45 ? bPal[2] : bPal[1];
          sampleIntensity = isRim ? 0.65 : 0.9;
        } else if (inClaw) {
          sampleColor = clawPinchA.dist < 0.36 ? bPal[3] : bPal[2];
          sampleIntensity = 0.88;
        } else if (inLeg) {
          sampleColor = isLegTip ? bPal[0] : bPal[1];
          sampleIntensity = isLegTip ? 0.58 : 0.74;
        }
      }

      if (sampleColor) {
        if (tweaks.shimmer > 0.02) {
          const wave = Math.sin(time * 4.8 + gx * 0.5 + gy * 0.4 + agent.seed);
          const boost = wave * tweaks.shimmer * 56;
          sampleColor = {
            r: Math.max(0, Math.min(255, Math.round(sampleColor.r + boost))),
            g: Math.max(0, Math.min(255, Math.round(sampleColor.g + boost))),
            b: Math.max(0, Math.min(255, Math.round(sampleColor.b + boost))),
          };
        }

        result.push({
          gx,
          gy,
          color: sampleColor,
          alpha: sampleAlpha,
          intensity: sampleIntensity,
          forcedChar,
        });
      }
    }
  }

  return result;
}

function aGlide(agent: CreatureAgent): number {
  return agent.glideBlend;
}
