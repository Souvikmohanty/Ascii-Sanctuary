export interface RGB {
  r: number;
  g: number;
  b: number;
}

const hexCache = new Map<string, RGB>();

export function hexToRgb(hex: string): RGB {
  const cached = hexCache.get(hex);
  if (cached) return cached;

  const clean = hex.replace('#', '').trim();
  let r = 56,
    g = 189,
    b = 248;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) || 0;
    g = parseInt(clean[1] + clean[1], 16) || 0;
    b = parseInt(clean[2] + clean[2], 16) || 0;
  } else if (clean.length >= 6) {
    r = parseInt(clean.slice(0, 2), 16) || 0;
    g = parseInt(clean.slice(2, 4), 16) || 0;
    b = parseInt(clean.slice(4, 6), 16) || 0;
  }

  const res = { r, g, b };
  hexCache.set(hex, res);
  return res;
}

export function shiftHueRgb(rgb: RGB, hueDeg: number): RGB {
  if (!hueDeg || hueDeg % 360 === 0) return rgb;

  const rNorm = rgb.r / 255;
  const gNorm = rgb.g / 255;
  const bNorm = rgb.b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  if (delta < 0.001) return rgb;

  let h = 0;
  if (max === rNorm) {
    h = ((gNorm - bNorm) / delta) % 6;
  } else if (max === gNorm) {
    h = (bNorm - rNorm) / delta + 2;
  } else {
    h = (rNorm - gNorm) / delta + 4;
  }
  h = (h * 60 + hueDeg + 360) % 360;

  const l = (max + min) / 2;
  const s = delta / (1 - Math.abs(2 * l - 1));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}
