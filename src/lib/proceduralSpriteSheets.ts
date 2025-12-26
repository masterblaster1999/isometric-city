// Procedural sprite-sheet generation
// -----------------------------------------------------------------------------
// This module provides a framework for generating sprite sheets at runtime using
// the Canvas 2D API.
//
// The IsoCity renderer already knows how to slice sprites out of a sheet via
// `getSpriteCoords(...)`. By generating a sheet that matches a SpritePack's
// `cols/rows/layout/spriteOrder`, we can swap out file-based art (png/webp)
// for procedurally generated assets without changing the rendering logic.

import type { SpritePack } from '@/lib/renderConfig';

export type ProceduralSpriteSheetVariant = 'main' | 'construction' | 'abandoned';

// ------------------------------
// Deterministic RNG (mulberry32)
// ------------------------------
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToCss(rgb: RGB, a: number = 1): string {
  return `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${a})`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function lighten(rgb: RGB, t: number): RGB {
  return mix(rgb, { r: 255, g: 255, b: 255 }, t);
}

function darken(rgb: RGB, t: number): RGB {
  return mix(rgb, { r: 0, g: 0, b: 0 }, t);
}

function withAlpha(color: string, alpha: number): string {
  // Accepts hex or rgba; for hex we convert.
  if (color.startsWith('#')) {
    return rgbToCss(hexToRgb(color), alpha);
  }
  return color;
}

// ------------------------------
// Sprite styles (very lightweight)
// ------------------------------
type SpriteKind = 'building' | 'tree' | 'park' | 'utility' | 'special';

type SpriteStyle = {
  kind: SpriteKind;
  baseColor: string;
  footprintX: number;
  footprintY: number;
  height: number;
  roofColor?: string;
  accentColor?: string;
};

function styleForSpriteKey(spriteKey: string): SpriteStyle {
  // Defaults
  const base: SpriteStyle = {
    kind: 'building',
    baseColor: '#64748b',
    footprintX: 1.1,
    footprintY: 1.1,
    height: 1.0,
    roofColor: '#94a3b8',
    accentColor: '#0f172a',
  };

  // Residential
  if (spriteKey.includes('house')) {
    return {
      kind: 'building',
      baseColor: '#60a5fa',
      footprintX: spriteKey === 'mansion' ? 1.7 : spriteKey === 'house_medium' ? 1.3 : 1.15,
      footprintY: spriteKey === 'mansion' ? 1.6 : spriteKey === 'house_medium' ? 1.25 : 1.1,
      height: spriteKey === 'mansion' ? 1.35 : spriteKey === 'house_medium' ? 1.1 : 0.9,
      roofColor: '#1d4ed8',
      accentColor: '#0b1220',
    };
  }
  if (spriteKey === 'residential') {
    return {
      kind: 'building',
      baseColor: '#3b82f6',
      footprintX: 1.55,
      footprintY: 1.45,
      height: 2.1,
      roofColor: '#1e3a8a',
      accentColor: '#0b1220',
    };
  }

  // Commercial
  if (spriteKey.includes('shop')) {
    return {
      kind: 'building',
      baseColor: '#fbbf24',
      footprintX: spriteKey === 'shop_medium' ? 1.4 : 1.2,
      footprintY: 1.2,
      height: spriteKey === 'shop_medium' ? 1.2 : 1.0,
      roofColor: '#b45309',
      accentColor: '#111827',
    };
  }
  if (spriteKey === 'commercial') {
    return {
      kind: 'building',
      baseColor: '#f59e0b',
      footprintX: 1.7,
      footprintY: 1.6,
      height: 2.4,
      roofColor: '#92400e',
      accentColor: '#111827',
    };
  }

  // Industrial
  if (spriteKey.includes('factory') || spriteKey === 'warehouse') {
    const isLarge = spriteKey === 'factory_large';
    const isMed = spriteKey === 'factory_medium';
    return {
      kind: 'building',
      baseColor: '#9ca3af',
      footprintX: isLarge ? 2.0 : isMed ? 1.6 : 1.35,
      footprintY: isLarge ? 1.8 : isMed ? 1.5 : 1.25,
      height: isLarge ? 1.6 : isMed ? 1.3 : 1.1,
      roofColor: '#6b7280',
      accentColor: '#111827',
    };
  }
  if (spriteKey === 'industrial') {
    return {
      kind: 'building',
      baseColor: '#94a3b8',
      footprintX: 1.8,
      footprintY: 1.7,
      height: 1.9,
      roofColor: '#475569',
      accentColor: '#0f172a',
    };
  }

  // Services
  if (spriteKey.includes('police')) {
    return {
      kind: 'building',
      baseColor: '#a5b4fc',
      footprintX: 1.45,
      footprintY: 1.35,
      height: 1.35,
      roofColor: '#4338ca',
      accentColor: '#111827',
    };
  }
  if (spriteKey.includes('fire_station')) {
    return {
      kind: 'building',
      baseColor: '#fb7185',
      footprintX: 1.55,
      footprintY: 1.4,
      height: 1.4,
      roofColor: '#be123c',
      accentColor: '#111827',
    };
  }
  if (spriteKey.includes('hospital')) {
    return {
      kind: 'building',
      baseColor: '#f1f5f9',
      footprintX: 1.7,
      footprintY: 1.55,
      height: 1.8,
      roofColor: '#94a3b8',
      accentColor: '#ef4444',
    };
  }
  if (spriteKey.includes('school')) {
    return {
      kind: 'building',
      baseColor: '#fde68a',
      footprintX: 1.55,
      footprintY: 1.45,
      height: 1.35,
      roofColor: '#b45309',
      accentColor: '#111827',
    };
  }
  if (spriteKey.includes('university')) {
    return {
      kind: 'building',
      baseColor: '#c4b5fd',
      footprintX: 1.75,
      footprintY: 1.65,
      height: 1.65,
      roofColor: '#6d28d9',
      accentColor: '#111827',
    };
  }

  // Parks + nature
  if (spriteKey === 'tree') {
    return {
      kind: 'tree',
      baseColor: '#16a34a',
      footprintX: 1.05,
      footprintY: 1.05,
      height: 1.35,
      roofColor: '#14532d',
      accentColor: '#78350f',
    };
  }
  if (spriteKey.startsWith('park')) {
    return {
      kind: 'park',
      baseColor: '#22c55e',
      footprintX: spriteKey === 'park_large' ? 1.9 : 1.45,
      footprintY: spriteKey === 'park_large' ? 1.75 : 1.35,
      height: 0.55,
      roofColor: '#166534',
      accentColor: '#064e3b',
    };
  }
  if (spriteKey === 'tennis') {
    return {
      kind: 'park',
      baseColor: '#10b981',
      footprintX: 1.7,
      footprintY: 1.55,
      height: 0.45,
      roofColor: '#065f46',
      accentColor: '#f8fafc',
    };
  }

  // Utilities
  if (spriteKey === 'power_plant') {
    return {
      kind: 'utility',
      baseColor: '#a3a3a3',
      footprintX: 2.0,
      footprintY: 1.7,
      height: 1.8,
      roofColor: '#525252',
      accentColor: '#f59e0b',
    };
  }
  if (spriteKey === 'water_tower') {
    return {
      kind: 'utility',
      baseColor: '#93c5fd',
      footprintX: 1.2,
      footprintY: 1.2,
      height: 2.0,
      roofColor: '#1d4ed8',
      accentColor: '#0f172a',
    };
  }
  if (spriteKey === 'subway_station') {
    return {
      kind: 'utility',
      baseColor: '#cbd5e1',
      footprintX: 1.6,
      footprintY: 1.5,
      height: 0.95,
      roofColor: '#64748b',
      accentColor: '#0f172a',
    };
  }

  // Special
  if (spriteKey === 'stadium') {
    return {
      kind: 'special',
      baseColor: '#e5e7eb',
      footprintX: 2.2,
      footprintY: 2.0,
      height: 1.0,
      roofColor: '#9ca3af',
      accentColor: '#0f172a',
    };
  }
  if (spriteKey === 'museum') {
    return {
      kind: 'special',
      baseColor: '#fef3c7',
      footprintX: 1.85,
      footprintY: 1.65,
      height: 1.35,
      roofColor: '#b45309',
      accentColor: '#0f172a',
    };
  }
  if (spriteKey === 'airport') {
    return {
      kind: 'special',
      baseColor: '#e2e8f0',
      footprintX: 2.4,
      footprintY: 2.1,
      height: 0.85,
      roofColor: '#64748b',
      accentColor: '#0f172a',
    };
  }
  if (spriteKey === 'space_program') {
    return {
      kind: 'special',
      baseColor: '#d1d5db',
      footprintX: 2.0,
      footprintY: 1.8,
      height: 2.2,
      roofColor: '#4b5563',
      accentColor: '#22d3ee',
    };
  }
  if (spriteKey === 'city_hall') {
    return {
      kind: 'special',
      baseColor: '#e0e7ff',
      footprintX: 1.9,
      footprintY: 1.7,
      height: 1.7,
      roofColor: '#4338ca',
      accentColor: '#111827',
    };
  }
  if (spriteKey === 'amusement_park') {
    return {
      kind: 'special',
      baseColor: '#fca5a5',
      footprintX: 2.1,
      footprintY: 1.9,
      height: 1.4,
      roofColor: '#be123c',
      accentColor: '#fbbf24',
    };
  }

  // Water is rendered via WATER_ASSET_PATH in the engine, but keep a tile anyway.
  if (spriteKey === 'water') {
    return {
      kind: 'park',
      baseColor: '#3b82f6',
      footprintX: 1.9,
      footprintY: 1.8,
      height: 0.25,
      roofColor: '#1d4ed8',
      accentColor: '#93c5fd',
    };
  }

  return base;
}

// ------------------------------
// Isometric drawing helpers
// ------------------------------

type Vec2 = { x: number; y: number };

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function drawPolygon(ctx: CanvasRenderingContext2D, pts: Vec2[], fill: string, stroke?: string, strokeWidth: number = 1): void {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function drawIsoPrism(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  baseY: number,
  isoUnitW: number,
  isoUnitH: number,
  sizeX: number,
  sizeY: number,
  heightPx: number,
  colors: { top: string; left: string; right: string; outline: string }
): { top: Vec2[]; left: Vec2[]; right: Vec2[]; base: Vec2[] } {
  const u: Vec2 = { x: isoUnitW / 2, y: isoUnitH / 2 };
  const v: Vec2 = { x: -isoUnitW / 2, y: isoUnitH / 2 };

  const c: Vec2 = { x: center.x, y: baseY };

  const halfX = scale(u, sizeX / 2);
  const halfY = scale(v, sizeY / 2);

  const p0 = sub(sub(c, halfX), halfY); // back-left
  const p1 = add(sub(c, halfY), halfX); // back-right
  const p2 = add(add(c, halfX), halfY); // front-right
  const p3 = add(add(c, halfY), sub({ x: 0, y: 0 }, halfX)); // front-left

  const lift: Vec2 = { x: 0, y: -heightPx };
  const p0t = add(p0, lift);
  const p1t = add(p1, lift);
  const p2t = add(p2, lift);
  const p3t = add(p3, lift);

  // Draw order: right, left, top for decent depth.
  const rightFace = [p1, p2, p2t, p1t];
  const leftFace = [p0, p3, p3t, p0t];
  const topFace = [p0t, p1t, p2t, p3t];

  drawPolygon(ctx, rightFace, colors.right, colors.outline, 1);
  drawPolygon(ctx, leftFace, colors.left, colors.outline, 1);
  drawPolygon(ctx, topFace, colors.top, colors.outline, 1);

  return { top: topFace, left: leftFace, right: rightFace, base: [p0, p1, p2, p3] };
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  face: Vec2[],
  rng: () => number,
  color: string
): void {
  // Face is a quad in order [a,b,c,d]
  if (face.length !== 4) return;

  // Approximate bounding box of the face and sprinkle rectangles.
  const xs = face.map((p) => p.x);
  const ys = face.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX;
  const h = maxY - minY;

  // Avoid tiny faces.
  if (w < 12 || h < 12) return;

  const cols = Math.max(2, Math.floor(w / 16));
  const rows = Math.max(2, Math.floor(h / 18));

  const padX = w * 0.15;
  const padY = h * 0.2;

  const cellW = (w - padX * 2) / cols;
  const cellH = (h - padY * 2) / rows;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.18) continue; // some lights off
      const wx = minX + padX + c * cellW + cellW * 0.2;
      const wy = minY + padY + r * cellH + cellH * 0.25;
      const ww = cellW * 0.55;
      const wh = cellH * 0.45;
      ctx.fillRect(wx, wy, ww, wh);
    }
  }
  ctx.restore();
}

function drawConstructionOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = Math.max(2, Math.floor(w / 64));
  ctx.strokeStyle = 'rgba(245, 158, 11, 1)'; // amber-ish

  const step = Math.max(12, Math.floor(w / 14));
  for (let i = -w; i < w * 2; i += step) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h * 0.25);
    ctx.lineTo(x + i + w, y + h * 0.9);
    ctx.stroke();
  }

  // A few scaffold vertical bars
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(148, 163, 184, 1)';
  const bars = 3;
  for (let i = 0; i < bars; i++) {
    const bx = x + (w * (i + 1)) / (bars + 1);
    ctx.beginPath();
    ctx.moveTo(bx, y + h * 0.25);
    ctx.lineTo(bx, y + h * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAbandonedOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: () => number
): void {
  ctx.save();
  // Dark grime
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(x, y, w, h);

  // Random cracks / streaks
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(15, 23, 42, 1)';
  const lines = 6;
  for (let i = 0; i < lines; i++) {
    ctx.beginPath();
    const sx = x + rng() * w;
    const sy = y + rng() * h;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (rng() - 0.5) * w * 0.6, sy + rng() * h * 0.4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: () => number
): void {
  const trunkW = w * 0.07;
  const trunkH = h * 0.22;
  const cx = x + w * 0.5;
  const baseY = y + h * 0.88;

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.12, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Trunk
  ctx.fillStyle = '#92400e';
  ctx.fillRect(cx - trunkW / 2, baseY - trunkH, trunkW, trunkH);

  // Canopy
  const canopyR = w * (0.18 + rng() * 0.06);
  const canopyY = baseY - trunkH - canopyR * 0.8;
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(cx, canopyY, canopyR, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.arc(cx - canopyR * 0.25, canopyY - canopyR * 0.15, canopyR * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: () => number
): void {
  // Simple green patch + a couple of trees
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.82, w * 0.28, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tiny trees
  const t = Math.floor(1 + rng() * 2);
  for (let i = 0; i < t; i++) {
    const tx = x + w * (0.35 + rng() * 0.3);
    const ty = y + h * (0.55 + rng() * 0.1);
    ctx.save();
    ctx.translate(tx - w * 0.5, ty - h * 0.5);
    drawTree(ctx, x, y, w, h, rng);
    ctx.restore();
  }
}

function drawTennisCourt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const cx = x + w * 0.5;
  const baseY = y + h * 0.84;

  // A little isometric-ish court as a flat diamond.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h * 0.22);
  ctx.lineTo(cx + w * 0.22, baseY);
  ctx.lineTo(cx, baseY + h * 0.22);
  ctx.lineTo(cx - w * 0.22, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Lines
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - h * 0.18);
  ctx.lineTo(cx, baseY + h * 0.18);
  ctx.stroke();

  ctx.restore();
}

function drawUtilityExtras(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  bounds: { top: Vec2[]; left: Vec2[]; right: Vec2[]; base: Vec2[] },
  rng: () => number,
  accentColor: string
): void {
  if (spriteKey === 'water_tower') {
    // Simple tower top cap
    const top = bounds.top;
    const xs = top.map((p) => p.x);
    const ys = top.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + rng() * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (spriteKey === 'power_plant') {
    // A smokestack
    const base = bounds.base;
    const bx = (base[0].x + base[1].x) / 2;
    const by = (base[0].y + base[1].y) / 2;

    const stackW = 10;
    const stackH = 40;

    ctx.save();
    ctx.fillStyle = '#525252';
    ctx.fillRect(bx - stackW / 2, by - stackH, stackW, stackH);

    // Smoke
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#e5e7eb';
    for (let i = 0; i < 3; i++) {
      const sx = bx + (rng() - 0.5) * 10;
      const sy = by - stackH - i * 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + rng() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawProceduralSpriteTile(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  variant: ProceduralSpriteSheetVariant,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: () => number
): void {
  ctx.save();
  ctx.clearRect(x, y, w, h);

  const style = styleForSpriteKey(spriteKey);

  // Common anchor
  const center: Vec2 = { x: x + w * 0.5, y: y + h * 0.5 };
  const baseY = y + h * 0.88;

  // Shadow under most things
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.beginPath();
  ctx.ellipse(center.x, baseY, w * 0.16, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Non-building tiles
  if (style.kind === 'tree') {
    drawTree(ctx, x, y, w, h, rng);
    ctx.restore();
    return;
  }
  if (style.kind === 'park') {
    if (spriteKey === 'tennis') {
      drawTennisCourt(ctx, x, y, w, h);
    } else {
      drawPark(ctx, x, y, w, h, rng);
    }
    ctx.restore();
    return;
  }

  // Isometric building prism
  const isoUnitW = w * 0.26;
  const isoUnitH = isoUnitW * 0.5;
  const baseRgb = hexToRgb(style.baseColor);
  const roofRgb = hexToRgb(style.roofColor || style.baseColor);
  const outline = withAlpha('#0f172a', 0.35);

  // Variant shading tweaks
  const variantTint = variant === 'construction'
    ? { r: 255, g: 255, b: 255 }
    : variant === 'abandoned'
      ? { r: 0, g: 0, b: 0 }
      : null;
  const tintStrength = variant === 'construction' ? 0.18 : variant === 'abandoned' ? 0.22 : 0;

  const baseForVariant = variantTint ? mix(baseRgb, variantTint, tintStrength) : baseRgb;
  const roofForVariant = variantTint ? mix(roofRgb, variantTint, tintStrength) : roofRgb;

  const colors = {
    top: rgbToCss(lighten(roofForVariant, 0.15), 1),
    left: rgbToCss(baseForVariant, 1),
    right: rgbToCss(darken(baseForVariant, 0.18), 1),
    outline,
  };

  const heightPx = h * 0.18 * style.height;

  const bounds = drawIsoPrism(
    ctx,
    center,
    baseY,
    isoUnitW,
    isoUnitH,
    style.footprintX,
    style.footprintY,
    heightPx,
    colors
  );

  // Windows for taller buildings
  if (style.height >= 1.2) {
    const winColor = spriteKey === 'hospital'
      ? '#ef4444'
      : spriteKey === 'police_station'
        ? '#60a5fa'
        : '#f8fafc';
    drawWindows(ctx, bounds.right, rng, winColor);
    drawWindows(ctx, bounds.left, rng, winColor);
  }

  // Special accents
  if (style.accentColor) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = style.accentColor;

    // Simple sign on the front-right face bounding box
    const face = bounds.right;
    const xs = face.map((p) => p.x);
    const ys = face.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const signW = (maxX - minX) * 0.35;
    const signH = (maxY - minY) * 0.12;
    const sx = minX + (maxX - minX) * 0.52;
    const sy = minY + (maxY - minY) * 0.42;
    ctx.fillRect(sx, sy, signW, signH);

    ctx.restore();
  }

  // Utility extras
  if (style.kind === 'utility' || spriteKey === 'power_plant' || spriteKey === 'water_tower') {
    drawUtilityExtras(ctx, spriteKey, bounds, rng, style.accentColor || '#0f172a');
  }

  // Variant overlays
  if (variant === 'construction') {
    drawConstructionOverlay(ctx, x, y, w, h);
  }
  if (variant === 'abandoned') {
    drawAbandonedOverlay(ctx, x, y, w, h, rng);
  }

  ctx.restore();
}

export function isProceduralSpritePack(pack: SpritePack): boolean {
  return !!(pack as any).procedural;
}

export function generateProceduralSpriteSheet(
  pack: SpritePack,
  variant: ProceduralSpriteSheetVariant
): HTMLCanvasElement {
  if (!isProceduralSpritePack(pack)) {
    throw new Error(`Sprite pack ${pack.id} is not configured for procedural generation.`);
  }

  const procedural = (pack as any).procedural as { tileWidth: number; tileHeight: number; seed?: number };
  const tileW = Math.max(16, Math.floor(procedural.tileWidth));
  const tileH = Math.max(16, Math.floor(procedural.tileHeight));
  const seed = procedural.seed ?? 0;

  if (typeof document === 'undefined') {
    // Should never happen in normal gameplay because this module is only called
    // from client components.
    throw new Error('Procedural sprite generation requires a browser (document is undefined).');
  }

  const sheetW = tileW * pack.cols;
  const sheetH = tileH * pack.rows;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, sheetW, sheetH);

  for (let index = 0; index < pack.spriteOrder.length; index++) {
    const spriteKey = pack.spriteOrder[index];

    let col: number;
    let row: number;

    if (pack.layout === 'column') {
      col = Math.floor(index / pack.rows);
      row = index % pack.rows;
    } else {
      col = index % pack.cols;
      row = Math.floor(index / pack.cols);
    }

    if (col < 0 || col >= pack.cols || row < 0 || row >= pack.rows) {
      continue;
    }

    const cellX = col * tileW;
    const cellY = row * tileH;

    const rng = mulberry32(hashStringToSeed(`${seed}:${pack.id}:${variant}:${spriteKey}`));
    drawProceduralSpriteTile(ctx, spriteKey, variant, cellX, cellY, tileW, tileH, rng);
  }

  return canvas;
}
