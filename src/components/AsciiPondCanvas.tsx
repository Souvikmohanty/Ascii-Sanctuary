import React, { useEffect, useRef } from 'react';
import {
  BackgroundMode,
  BuiltinSceneryId,
  CreatureTweaks,
  CustomCreatureBlueprint,
  SceneryTweaks,
} from '../types/creature';
import {
  CreatureAgent,
  pickAsciiChar,
  RippleWave,
  SparkleParticle,
  spawnAgent,
  sampleCreatureCells,
  stepAgents,
} from '../engine/creatureRenderer';
import { renderSceneryFrame } from '../engine/sceneryRenderer';
import { BASE_SCENERY_TWEAKS } from '../data/sceneries';

interface AsciiPondCanvasProps {
  backgroundMode?: BackgroundMode;
  speciesId: string;
  dotColor: string;
  tweaks: CreatureTweaks;
  blueprint?: CustomCreatureBlueprint;
  sceneryId?: BuiltinSceneryId;
  sceneryTweaks?: SceneryTweaks;
  cellSize?: number;
  interactive?: boolean;
  className?: string;
}

export const AsciiPondCanvas: React.FC<AsciiPondCanvasProps> = ({
  backgroundMode = 'animals',
  speciesId,
  dotColor,
  tweaks,
  blueprint,
  sceneryId = 'sakura-moonrise',
  sceneryTweaks = BASE_SCENERY_TWEAKS,
  cellSize = 9,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<BackgroundMode>(backgroundMode);
  const tweaksRef = useRef(tweaks);
  const speciesRef = useRef(speciesId);
  const dotColorRef = useRef(dotColor);
  const blueprintRef = useRef(blueprint);
  const sceneryIdRef = useRef<BuiltinSceneryId>(sceneryId);
  const sceneryTweaksRef = useRef<SceneryTweaks>(sceneryTweaks);

  modeRef.current = backgroundMode;
  tweaksRef.current = tweaks;
  speciesRef.current = speciesId;
  dotColorRef.current = dotColor;
  blueprintRef.current = blueprint;
  sceneryIdRef.current = sceneryId;
  sceneryTweaksRef.current = sceneryTweaks;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener('resize', resize);

    const agents: CreatureAgent[] = [];
    const initialCount = Math.max(1, Math.round(tweaksRef.current.amount));
    for (let i = 0; i < initialCount; i++) {
      agents.push(spawnAgent(i, width, height, tweaksRef.current, true));
    }

    const sparkles: SparkleParticle[] = [];
    const ripples: RippleWave[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const handlePointerMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 6,
        maxRadius: 135,
        alpha: 0.55,
      });
    };

    if (interactive) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseleave', handlePointerLeave);
      canvas.addEventListener('click', handleClick);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = reducedMotion ? Math.min(0.016, rawDt * 0.25) : Math.min(0.05, rawDt);
      elapsed += dt;

      const isScenery = modeRef.current === 'sceneries';
      const currentTweaks = tweaksRef.current;
      const activeGrid = isScenery ? sceneryTweaksRef.current.grid : currentTweaks.grid;

      if (!isScenery) {
        stepAgents(
          agents,
          sparkles,
          width,
          height,
          dt,
          currentTweaks,
          speciesRef.current,
          cellSize,
          pointer,
          dotColorRef.current,
          elapsed
        );
      }

      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        rip.radius += dt * 150;
        rip.alpha = Math.max(0, 0.55 * (1 - rip.radius / rip.maxRadius));
        if (rip.radius >= rip.maxRadius) {
          ripples.splice(r, 1);
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Deep obsidian void backdrop
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, width, height);

      // Subtle background ASCII lattice
      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const gridAlpha = activeGrid * 0.16;

      if (gridAlpha > 0.008) {
        ctx.fillStyle = `rgba(148, 163, 184, ${gridAlpha.toFixed(3)})`;
        ctx.font = `500 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let gy = 0; gy < rows; gy++) {
          const py = gy * cellSize + cellSize * 0.5;
          for (let gx = 0; gx < cols; gx++) {
            const px = gx * cellSize + cellSize * 0.5;
            if ((gx + gy) % 2 === 0 || activeGrid > 0.45) {
              ctx.fillText((gx * 7 + gy * 13) % 11 === 0 ? '+' : '·', px, py);
            }
          }
        }
      }

      if (isScenery) {
        renderSceneryFrame(
          ctx,
          cols,
          rows,
          cellSize,
          sceneryIdRef.current,
          sceneryTweaksRef.current,
          elapsed,
          pointer
        );
      } else {
        // Render creature trails
        if (currentTweaks.trail > 0.04) {
          for (let i = 0; i < agents.length; i++) {
            const a = agents[i];
            const depthAlpha = Math.max(0.2, 1 - currentTweaks.distanceFade * 0.65 * (1 - a.z));
            for (let t = 0; t < a.trail.length; t++) {
              const pt = a.trail[t];
              const fade = Math.max(0, (1 - pt.age) * 0.42 * depthAlpha);
              if (fade <= 0.02) continue;
              const gx = Math.round(pt.x / cellSize);
              const gy = Math.round(pt.y / cellSize);
              const px = gx * cellSize;
              const py = gy * cellSize;

              ctx.fillStyle = `rgba(${pt.color.r}, ${pt.color.g}, ${pt.color.b}, ${(fade * 0.42).toFixed(3)})`;
              ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

              if (currentTweaks.asciiDetail > 0.2) {
                ctx.fillStyle = `rgba(${pt.color.r}, ${pt.color.g}, ${pt.color.b}, ${(fade * 0.9).toFixed(3)})`;
                ctx.font = `500 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(t % 2 === 0 ? ':' : '·', px + cellSize * 0.5, py + cellSize * 0.5);
              }
            }
          }
        }

        // Render sparkles
        for (let s = 0; s < sparkles.length; s++) {
          const sp = sparkles[s];
          const progress = sp.life / sp.maxLife;
          const alpha = Math.sin(progress * Math.PI) * 0.9;
          if (alpha <= 0.02) continue;
          const px = sp.gx * cellSize;
          const py = sp.gy * cellSize;

          ctx.fillStyle = `rgba(${sp.color.r}, ${sp.color.g}, ${sp.color.b}, ${(alpha * 0.35).toFixed(3)})`;
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          ctx.font = `600 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sp.char, px + cellSize * 0.5, py + cellSize * 0.5);
        }

        // Sort agents far-to-front so closer creatures overlap distant ones cleanly
        const sorted = [...agents].sort((a, b) => a.z - b.z);
        const detail = currentTweaks.asciiDetail;

        ctx.font = `600 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < sorted.length; i++) {
          const agent = sorted[i];
          const cells = sampleCreatureCells(
            agent,
            speciesRef.current,
            currentTweaks,
            cellSize,
            elapsed,
            blueprintRef.current
          );

          for (let c = 0; c < cells.length; c++) {
            const cell = cells[c];
            if (cell.gx < -2 || cell.gx > cols + 2 || cell.gy < -2 || cell.gy > rows + 2) {
              continue;
            }
            const px = cell.gx * cellSize;
            const py = cell.gy * cellSize;

            // Luminous cell fill + crisp ASCII glyph overlay
            const tileAlpha = cell.alpha * (0.94 - detail * 0.38);
            if (tileAlpha > 0.03) {
              ctx.fillStyle = `rgba(${cell.color.r}, ${cell.color.g}, ${cell.color.b}, ${tileAlpha.toFixed(3)})`;
              ctx.fillRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
            }

            if (detail > 0.05) {
              const ch =
                cell.forcedChar ||
                pickAsciiChar(cell.intensity, detail, cell.gx + cell.gy + i);
              if (ch) {
                const glyphAlpha = cell.alpha * (0.4 + detail * 0.6);
                ctx.fillStyle = `rgba(${Math.min(255, cell.color.r + 55)}, ${Math.min(255, cell.color.g + 55)}, ${Math.min(255, cell.color.b + 55)}, ${glyphAlpha.toFixed(3)})`;
                ctx.fillText(ch, px + cellSize * 0.5, py + cellSize * 0.52);
              }
            }
          }
        }
      }

      // Click ripples on the ASCII grid (active in both Animals and Sceneries modes)
      if (ripples.length > 0) {
        ctx.font = `500 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < ripples.length; r++) {
          const rip = ripples[r];
          const minGx = Math.max(0, Math.floor((rip.x - rip.radius - 16) / cellSize));
          const maxGx = Math.min(cols - 1, Math.ceil((rip.x + rip.radius + 16) / cellSize));
          const minGy = Math.max(0, Math.floor((rip.y - rip.radius - 16) / cellSize));
          const maxGy = Math.min(rows - 1, Math.ceil((rip.y + rip.radius + 16) / cellSize));

          for (let gy = minGy; gy <= maxGy; gy++) {
            for (let gx = minGx; gx <= maxGx; gx++) {
              const px = gx * cellSize + cellSize * 0.5;
              const py = gy * cellSize + cellSize * 0.5;
              const d = Math.hypot(px - rip.x, py - rip.y);
              if (Math.abs(d - rip.radius) < cellSize * 1.1) {
                ctx.fillStyle = `rgba(56, 189, 248, ${(rip.alpha * 0.85).toFixed(3)})`;
                ctx.fillText('~', px, py);
              }
            }
          }
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      if (interactive) {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseleave', handlePointerLeave);
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [cellSize, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-label={
        backgroundMode === 'sceneries'
          ? `Animated ASCII ${sceneryId} scenery canvas`
          : `Animated ASCII ${speciesId} canvas`
      }
    />
  );
};
