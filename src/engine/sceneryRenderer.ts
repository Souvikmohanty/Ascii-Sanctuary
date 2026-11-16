import { BuiltinSceneryId, SceneryTweaks } from '../types/creature';
import { hexToRgb, RGB, shiftHueRgb } from './colorUtils';

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function hash1(n: number): number {
  const v = Math.sin(n * 91.3458) * 47453.5453;
  return v - Math.floor(v);
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  const c = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * c),
    g: Math.round(a.g + (b.g - a.g) * c),
    b: Math.round(a.b + (b.b - a.b) * c),
  };
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  cellSize: number,
  rgb: RGB,
  tileAlpha: number,
  ch: string,
  glyphAlpha: number,
  detail: number
): void {
  const px = gx * cellSize;
  const py = gy * cellSize;

  const finalTile = tileAlpha * (0.94 - detail * 0.36);
  if (finalTile > 0.025) {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, finalTile).toFixed(3)})`;
    ctx.fillRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
  }

  if (detail > 0.05 && ch) {
    const finalGlyph = glyphAlpha * (0.38 + detail * 0.62);
    if (finalGlyph > 0.03) {
      ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 58)}, ${Math.min(255, rgb.g + 58)}, ${Math.min(255, rgb.b + 58)}, ${Math.min(1, finalGlyph).toFixed(3)})`;
      ctx.fillText(ch, px + cellSize * 0.5, py + cellSize * 0.52);
    }
  }
}

function drawStarfield(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  maxRow: number,
  cellSize: number,
  tweaks: SceneryTweaks,
  t: number,
  starColor: RGB,
  warmColor: RGB,
  densityScale = 1
): void {
  const threshold = 0.986 - tweaks.atmosphere * 0.022 * densityScale;
  for (let gy = 0; gy < maxRow; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const h = hash2(gx, gy);
      if (h > threshold) {
        const phase = h * 40 + t * (1.2 + (h % 0.01) * 180);
        const twinkle = 0.45 + 0.55 * Math.sin(phase);
        const bright = h > 0.9965;
        const alpha = (bright ? 0.85 : 0.45) * (0.55 + tweaks.shimmer * 0.45) * twinkle;
        if (alpha <= 0.06) continue;
        const ch = bright ? (twinkle > 0.78 ? '*' : '+') : h > 0.991 ? ':' : '·';
        const rgb = h > 0.995 ? warmColor : starColor;
        drawCell(ctx, gx, gy, cellSize, rgb, alpha * 0.42, ch, alpha, tweaks.asciiDetail);
      }
    }
  }
}

export function renderSceneryFrame(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  cellSize: number,
  sceneryId: BuiltinSceneryId,
  tweaks: SceneryTweaks,
  elapsed: number,
  pointer: { x: number; y: number; active: boolean }
): void {
  const t = elapsed * tweaks.tempo;
  const shift = (hex: string): RGB => shiftHueRgb(hexToRgb(hex), tweaks.hueShift);
  const pointerGx = pointer.x / cellSize;
  const pointerGy = pointer.y / cellSize;

  ctx.font = `600 ${Math.max(8, cellSize - 2)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (sceneryId === 'sakura-moonrise') {
    const petalIvory = shift('#FFF1F2');
    const blossomBright = shift('#FBCFE8');
    const blossomMid = shift('#F472B6');
    const blossomDeep = shift('#BE185D');
    const stamenGold = shift('#FDE047');
    const stamenRose = shift('#FB7185');
    const moonCore = shift('#FFFBEB');
    const moonHalo = shift('#FDE68A');
    const barkDark = shift('#3B2736');
    const barkLight = shift('#5B3E52');
    const hillFar = shift('#1E1B4B');
    const waterC = shift('#312E81');

    const waterRow = Math.floor(rows * 0.78);
    drawStarfield(ctx, cols, rows, Math.floor(rows * 0.65), cellSize, tweaks, t, moonCore, blossomBright, 0.65);

    // Full luminous Moon (delicate, distant proportion)
    const moonCx = Math.floor(cols * 0.77);
    const moonCy = Math.max(6, Math.floor(rows * 0.23));
    const moonR = Math.max(3.1, Math.min(4.6, Math.min(cols, rows) * 0.045));
    const haloSpan = Math.ceil(moonR + 2);
    for (let gy = moonCy - haloSpan; gy <= moonCy + haloSpan; gy++) {
      for (let gx = moonCx - haloSpan; gx <= moonCx + haloSpan; gx++) {
        if (gx < 0 || gx >= cols || gy < 0 || gy >= waterRow) continue;
        const d = Math.hypot(gx - moonCx, gy - moonCy);
        if (d <= moonR) {
          const crater = hash2(gx * 0.7, gy * 0.7) > 0.84;
          const c = crater ? moonHalo : moonCore;
          const ch = d > moonR - 0.85 ? ':' : crater ? '+' : '@';
          drawCell(ctx, gx, gy, cellSize, c, 0.92, ch, 0.9, tweaks.asciiDetail);
        } else if (d <= moonR + 1.8) {
          const fade = 1 - (d - moonR) / 1.8;
          drawCell(ctx, gx, gy, cellSize, moonHalo, fade * 0.2, '·', fade * 0.36, tweaks.asciiDetail);
        }
      }
    }

    // Rolling misty hills
    for (let gx = 0; gx < cols; gx++) {
      const hillY = Math.round(
        rows * 0.68 -
          Math.sin(gx * 0.028 + 0.6) * (rows * 0.06) -
          Math.cos(gx * 0.062) * (rows * 0.025)
      );
      for (let gy = hillY; gy < waterRow; gy++) {
        const fade = 1 - tweaks.depthMist * 0.42;
        drawCell(ctx, gx, gy, cellSize, hillFar, 0.78 * fade, gy === hillY ? '~' : ':', 0.45 * fade, tweaks.asciiDetail);
      }
    }

    // Reflection Pond with Moon Column & soft blossom shimmer
    for (let gy = waterRow; gy < rows; gy++) {
      const depth = (gy - waterRow) / Math.max(1, rows - waterRow);
      for (let gx = 0; gx < cols; gx++) {
        const wobble = Math.sin(gy * 0.65 + t * 2.1 * tweaks.wind) * (1.8 * tweaks.wave);
        const distFromMoonCol = Math.abs(gx - (moonCx + wobble));
        const colWidth = moonR * (0.45 + depth * 0.75);
        if (distFromMoonCol < colWidth) {
          const bright = (1 - distFromMoonCol / colWidth) * (0.72 + tweaks.shimmer * 0.28);
          const rippleHit = Math.sin(gy * 0.9 - t * 2.5 + gx * 0.2) > -0.25;
          if (rippleHit) {
            drawCell(ctx, gx, gy, cellSize, moonHalo, bright * 0.65, bright > 0.55 ? '=' : '~', bright, tweaks.asciiDetail);
          }
        } else if (gx < cols * 0.36 && hash2(gx + Math.floor(t * 0.5), gy) > 0.975) {
          drawCell(ctx, gx, gy, cellSize, blossomMid, 0.35, '~', 0.48, tweaks.asciiDetail);
        } else if (gy === waterRow || (gx + gy) % 5 === 0) {
          drawCell(ctx, gx, gy, cellSize, waterC, 0.28, '~', 0.35, tweaks.asciiDetail);
        }
      }
    }

    // Helper: draw smoothly curved, tapered cherry-bark branch segment
    const sway = Math.sin(t * 0.85 * tweaks.wind) * 0.9 * tweaks.wave;
    const drawBranch = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      bendY: number,
      r0: number,
      r1: number
    ) => {
      const steps = Math.max(12, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
      for (let s = 0; s <= steps; s++) {
        const p = s / steps;
        const cx = x0 + (x1 - x0) * p + sway * p * 0.55;
        const cy = y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * bendY + sway * p * 0.25;
        const rad = r0 + (r1 - r0) * p;
        const ceilR = Math.ceil(rad);
        for (let dy = -ceilR; dy <= ceilR; dy++) {
          for (let dx = -ceilR; dx <= ceilR; dx++) {
            if (Math.hypot(dx, dy) <= Math.max(0.55, rad)) {
              const gx = Math.round(cx + dx);
              const gy = Math.round(cy + dy);
              if (gx >= 0 && gx < cols && gy >= 0 && gy < waterRow) {
                const isUpperRim = dy < 0;
                drawCell(
                  ctx,
                  gx,
                  gy,
                  cellSize,
                  isUpperRim ? barkLight : barkDark,
                  0.94,
                  rad > 1.0 ? '#' : Math.abs(x1 - x0) > Math.abs(y1 - y0) ? '-' : '/',
                  0.82,
                  tweaks.asciiDetail
                );
              }
            }
          }
        }
      }
    };

    // Main sweeping cherry bough & natural forked twigs
    drawBranch(0, rows * 0.62, cols * 0.29, rows * 0.31, rows * 0.04, 1.85, 0.55);
    drawBranch(cols * 0.08, rows * 0.50, cols * 0.17, rows * 0.21, rows * 0.025, 1.15, 0.42);
    drawBranch(cols * 0.16, rows * 0.39, cols * 0.36, rows * 0.40, -rows * 0.02, 1.0, 0.38);
    drawBranch(cols * 0.21, rows * 0.34, cols * 0.35, rows * 0.22, rows * 0.02, 0.85, 0.36);
    drawBranch(cols * 0.05, rows * 0.56, cols * 0.13, rows * 0.49, rows * 0.015, 0.9, 0.38);
    drawBranch(cols * 0.28, rows * 0.31, cols * 0.40, rows * 0.31, rows * 0.01, 0.55, 0.32);

    // Helper: draw realistic 5-petal notched Sakura blossom maintaining delicate aesthetic size
    const drawSakuraFlower = (
      fx: number,
      fy: number,
      radius: number,
      rot: number,
      isBud: boolean
    ) => {
      if (isBud) {
        const budR = Math.max(1.2, radius);
        const minX = Math.floor(fx - budR - 1);
        const maxX = Math.ceil(fx + budR + 1);
        const minY = Math.floor(fy - budR - 1);
        const maxY = Math.ceil(fy + budR + 1);
        for (let gy = minY; gy <= maxY; gy++) {
          for (let gx = minX; gx <= maxX; gx++) {
            if (gx < 0 || gx >= cols || gy < 0 || gy >= waterRow) continue;
            const d = Math.hypot(gx - fx, (gy - fy) * 1.15);
            if (d <= budR) {
              drawCell(
                ctx,
                gx,
                gy,
                cellSize,
                d < budR * 0.5 ? blossomMid : blossomDeep,
                0.88,
                d < budR * 0.5 ? 'o' : ':',
                0.9,
                tweaks.asciiDetail
              );
            }
          }
        }
        return;
      }

      const ceilR = Math.ceil(radius + 1);
      for (let gy = Math.floor(fy - ceilR); gy <= Math.ceil(fy + ceilR); gy++) {
        for (let gx = Math.floor(fx - ceilR); gx <= Math.ceil(fx + ceilR); gx++) {
          if (gx < 0 || gx >= cols || gy < 0 || gy >= waterRow) continue;
          const dx = gx - fx;
          const dy = gy - fy;
          const d = Math.hypot(dx, dy);
          if (d > radius + 0.85) continue;

          const ang = Math.atan2(dy, dx) - rot;
          const lobe = 0.5 + 0.5 * Math.cos(5 * ang);
          const tipNotch = Math.pow(lobe, 5) * 0.14 * radius;
          const petalBoundary = radius * (0.42 + 0.58 * Math.pow(lobe, 0.55)) - tipNotch;

          if (d <= Math.max(0.85, radius * 0.27)) {
            const isCenterDot = d < radius * 0.14;
            drawCell(
              ctx,
              gx,
              gy,
              cellSize,
              isCenterDot ? stamenGold : stamenRose,
              0.96,
              isCenterDot ? '@' : '*',
              1.0,
              tweaks.asciiDetail
            );
          } else if (d <= petalBoundary) {
            const radialNorm = d / Math.max(0.5, petalBoundary);
            const shimmerWave = 0.88 + 0.12 * Math.sin(t * 2.0 + gx * 0.4 + gy * 0.3) * tweaks.shimmer;
            const c =
              radialNorm < 0.42
                ? petalIvory
                : radialNorm < 0.78
                ? blossomBright
                : blossomMid;
            const ch =
              radialNorm < 0.45 ? '+' : radialNorm < 0.8 ? '*' : ':';
            drawCell(
              ctx,
              gx,
              gy,
              cellSize,
              c,
              0.9 * shimmerWave,
              ch,
              0.95 * shimmerWave,
              tweaks.asciiDetail
            );
          } else if (d <= petalBoundary + 0.55) {
            drawCell(
              ctx,
              gx,
              gy,
              cellSize,
              blossomDeep,
              0.24,
              '·',
              0.38,
              tweaks.asciiDetail
            );
          }
        }
      }
    };

    const scaleFactor = Math.max(0.85, Math.min(1.12, Math.min(cols, rows) / 105));
    const sakuraBlooms: [number, number, number, number, boolean][] = [
      [0.055, 0.55, 2.7, 0.2, false],
      [0.105, 0.51, 3.1, 0.8, false],
      [0.14, 0.48, 2.5, 1.4, false],
      [0.08, 0.46, 1.4, 0.0, true],
      [0.10, 0.39, 2.9, 0.5, false],
      [0.135, 0.31, 3.3, 1.1, false],
      [0.165, 0.23, 3.1, 0.3, false],
      [0.195, 0.20, 2.5, 0.9, false],
      [0.12, 0.25, 1.5, 0.0, true],
      [0.18, 0.38, 3.4, 0.1, false],
      [0.23, 0.34, 3.2, 0.7, false],
      [0.27, 0.30, 3.0, 1.3, false],
      [0.205, 0.43, 2.6, 0.4, false],
      [0.29, 0.24, 2.9, 0.9, false],
      [0.335, 0.22, 3.2, 0.2, false],
      [0.365, 0.24, 2.4, 1.0, false],
      [0.315, 0.19, 1.4, 0.0, true],
      [0.295, 0.39, 2.8, 0.6, false],
      [0.345, 0.40, 3.1, 1.2, false],
      [0.38, 0.38, 2.4, 0.3, false],
      [0.36, 0.32, 2.9, 0.8, false],
      [0.405, 0.30, 2.5, 0.5, false],
      [0.425, 0.33, 1.4, 0.0, true],
    ];

    for (let i = 0; i < sakuraBlooms.length; i++) {
      const [xf, yf, baseR, baseRot, isBud] = sakuraBlooms[i];
      const fx = cols * xf + sway * (0.35 + xf * 0.8);
      const fy = rows * yf + Math.cos(t * 1.05 + i * 0.9) * 0.28 * tweaks.wave;
      const rot = baseRot + Math.sin(t * 0.7 + i) * 0.08 * tweaks.wave;
      drawSakuraFlower(fx, fy, baseR * scaleFactor, rot, isBud);
    }

    // Drifting sakura petals
    const petalCount = Math.round(tweaks.atmosphere * 90);
    for (let i = 0; i < petalCount; i++) {
      const seed = hash1(i + 17);
      const speedX = (3.5 + seed * 4.5) * (0.4 + tweaks.wind * 0.75);
      const speedY = 1.8 + hash1(i + 81) * 2.5;
      let gx = ((hash1(i * 3.1) * cols + t * speedX) % (cols + 8)) - 4;
      let gy = ((hash1(i * 7.3) * rows + t * speedY) % (rows + 4)) - 2;
      gx += Math.sin(t * 1.8 + i) * 1.4 * tweaks.wave;

      if (pointer.active) {
        const dx = gx - pointerGx;
        const dy = gy - pointerGy;
        const pd = Math.hypot(dx, dy);
        if (pd < 10 && pd > 0.1) {
          gx += (dx / pd) * (10 - pd) * 0.4;
          gy += (dy / pd) * (10 - pd) * 0.3;
        }
      }
      const igx = Math.round(gx);
      const igy = Math.round(gy);
      if (igx >= 0 && igx < cols && igy >= 0 && igy < rows) {
        const c = i % 4 === 0 ? petalIvory : i % 2 === 0 ? blossomBright : blossomMid;
        const ch = i % 3 === 0 ? '*' : i % 3 === 1 ? ',' : '·';
        drawCell(ctx, igx, igy, cellSize, c, 0.86, ch, 0.95, tweaks.asciiDetail);
      }
    }
    return;
  }

  // Cosmic Nebula ('cosmic-nebula')
  const indigo = shift('#4338CA');
  const violet = shift('#A78BFA');
  const rose = shift('#F472B6');
  const cyan = shift('#38BDF8');
  const starGold = shift('#FEF08A');

  const driftX = t * 0.28 * tweaks.wind;
  const driftY = t * 0.14 * tweaks.wave;

  for (let gy = 0; gy < rows; gy++) {
    const ny = gy / Math.max(1, rows);
    for (let gx = 0; gx < cols; gx++) {
      const nx = gx / Math.max(1, cols);

      // Multi-octave swirling cosmic cloud density
      const warp = Math.sin(nx * 4.5 + driftX) * Math.cos(ny * 4.0 - driftY) * 0.85;
      const n1 = Math.sin((nx * 3.8 + ny * 2.2) + warp + driftX * 0.5);
      const n2 = Math.cos((nx * 7.2 - ny * 5.4) - warp * 1.4 - driftY * 0.7);
      const density = (n1 * 0.55 + n2 * 0.45) * 0.5 + 0.5;

      const ptrDist = pointer.active ? Math.hypot(gx - pointerGx, gy - pointerGy) : 999;
      const ptrBoost = ptrDist < 14 ? (1 - ptrDist / 14) * 0.28 : 0;

      const h = hash2(gx, gy);
      const isStar = h > 0.991 - tweaks.atmosphere * 0.012;

      if (isStar) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 2.5 + h * 100);
        const bright = h > 0.9975;
        const c = h > 0.996 ? starGold : cyan;
        const alpha = Math.min(1, (bright ? 0.95 : 0.6) * (0.55 + tweaks.shimmer * 0.45) * twinkle + ptrBoost);
        drawCell(ctx, gx, gy, cellSize, c, alpha * 0.5, bright ? '*' : '+', alpha, tweaks.asciiDetail);
      } else if (density > 0.48 - ptrBoost * 0.4) {
        const cloudStr = Math.min(1, (density - 0.44 + ptrBoost) * 1.65);
        const c =
          cloudStr > 0.76
            ? lerpRgb(rose, cyan, 0.5 + 0.5 * Math.sin(nx * 5 + t * 0.3))
            : cloudStr > 0.45
            ? violet
            : indigo;
        const fade = 1 - tweaks.depthMist * 0.35;
        const alpha = cloudStr * 0.52 * fade;
        if (alpha > 0.04) {
          const ch = cloudStr > 0.82 ? '#' : cloudStr > 0.64 ? '*' : cloudStr > 0.45 ? '+' : ':';
          drawCell(ctx, gx, gy, cellSize, c, alpha * 0.8, ch, alpha * 1.15, tweaks.asciiDetail);
        }
      }
    }
  }

  // Periodic gentle shooting star
  const meteorCycle = t * 0.42;
  const meteorFrac = meteorCycle - Math.floor(meteorCycle);
  if (meteorFrac < 0.38 && tweaks.atmosphere > 0.15) {
    const idx = Math.floor(meteorCycle);
    const startX = hash1(idx * 3.7) * cols * 0.75 + cols * 0.1;
    const startY = hash1(idx * 8.1) * rows * 0.35 + 2;
    const prog = meteorFrac / 0.38;
    const headX = startX + prog * 28;
    const headY = startY + prog * 11;
    for (let k = 0; k < 6; k++) {
      const mx = Math.round(headX - k * 1.4);
      const my = Math.round(headY - k * 0.55);
      if (mx >= 0 && mx < cols && my >= 0 && my < rows) {
        const a = (1 - k / 6) * (1 - prog * 0.6);
        drawCell(ctx, mx, my, cellSize, starGold, a * 0.8, k === 0 ? '@' : '*', a, tweaks.asciiDetail);
      }
    }
  }
}
