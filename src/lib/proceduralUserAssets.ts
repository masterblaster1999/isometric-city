// User procedural assets entrypoint
// -----------------------------------------------------------------------------
// This file is intended for *your project* to register any procedural sprite
// renderers (Canvas 2D) and optional procedural sprite packs — without editing
// the core generator.
//
// It is executed once from `src/components/Game.tsx` on the client.
//
// What you can do here:
// - Register custom sprite renderers (global or pack-scoped)
// - Register additional sprite packs (so they show up in Settings)

import {
  registerProceduralPrefixRenderer,
  registerProceduralSpriteRenderer,
  registerProceduralSpriteRendererForPack,
} from '@/lib/proceduralSpriteExtensions';
import { registerProceduralSpritePack } from '@/lib/spritePackRegistry';

// -----------------------------------------------------------------------------
// Example: register a *new* procedural pack that you can select in Settings.
// -----------------------------------------------------------------------------
// This creates a new SpritePack derived from the built-in "Default Theme" pack
// but uses generated sheets (no .webp/.png needed for that pack).
//
// You can then scope sprite overrides to JUST this pack id, so you can iterate
// on your procedural art without affecting the built-in procedural pack.
const USER_PROCEDURAL_PACK_ID = 'procedural-user';

export function registerProceduralUserAssets(): void {
  // Add a new "Procedural (User)" pack to Settings (safe to call multiple times).
  registerProceduralSpritePack('sprites4', {
    id: USER_PROCEDURAL_PACK_ID,
    name: 'Procedural (User)',
    seed: 20251227,
    // tileWidth / tileHeight are optional. Default (256x213) matches the built-in procedural pack.
    // tileWidth: 256,
    // tileHeight: 213,
  });

  // ---------------------------------------------------------------------------
  // Pack-scoped overrides (recommended)
  // ---------------------------------------------------------------------------
  // Only affects sprites when the user selects the 'Procedural (User)' pack.
  //
  // Tip: return `false`/`undefined` to fall back to the built-in generator.
  registerProceduralSpriteRendererForPack(USER_PROCEDURAL_PACK_ID, 'house_small', (args) => {
    const { ctx, x, y, w, h, rng, variant } = args;

    // Slight random palette variation per-cell
    const roofHue = Math.floor(200 + rng() * 30);
    const roof = variant === 'construction' ? '#fbbf24' : variant === 'abandoned' ? '#64748b' : `hsl(${roofHue} 70% 55%)`;
    const wallL = variant === 'abandoned' ? '#475569' : '#60a5fa';
    const wallR = variant === 'abandoned' ? '#334155' : '#3b82f6';

    const cx = x + w * 0.5;
    const baseY = y + h * 0.88;

    const fx = w * 0.22;
    const fy = h * 0.11;
    const wh = h * 0.22;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY, fx * 0.85, fy * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ground corners
    const gN = { x: cx, y: baseY - fy };
    const gW = { x: cx - fx, y: baseY };
    const gE = { x: cx + fx, y: baseY };
    const gS = { x: cx, y: baseY + fy };

    // Top corners (roof base)
    const tN = { x: gN.x, y: gN.y - wh };
    const tW = { x: gW.x, y: gW.y - wh };
    const tE = { x: gE.x, y: gE.y - wh };
    const tS = { x: gS.x, y: gS.y - wh };

    // Left wall
    ctx.beginPath();
    ctx.moveTo(tW.x, tW.y);
    ctx.lineTo(tS.x, tS.y);
    ctx.lineTo(gS.x, gS.y);
    ctx.lineTo(gW.x, gW.y);
    ctx.closePath();
    ctx.fillStyle = wallL;
    ctx.fill();

    // Right wall
    ctx.beginPath();
    ctx.moveTo(tE.x, tE.y);
    ctx.lineTo(tS.x, tS.y);
    ctx.lineTo(gS.x, gS.y);
    ctx.lineTo(gE.x, gE.y);
    ctx.closePath();
    ctx.fillStyle = wallR;
    ctx.fill();

    // Roof
    ctx.beginPath();
    ctx.moveTo(tN.x, tN.y);
    ctx.lineTo(tE.x, tE.y);
    ctx.lineTo(tS.x, tS.y);
    ctx.lineTo(tW.x, tW.y);
    ctx.closePath();
    ctx.fillStyle = roof;
    ctx.fill();

    // Simple door / window
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = variant === 'construction' ? '#0f172a' : '#1e293b';
    ctx.fillRect(cx - fx * 0.10, baseY - fy * 0.15, fx * 0.20, fy * 0.55);
    ctx.restore();

    // Construction stripes overlay
    if (variant === 'construction') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = Math.max(2, w * 0.01);
      for (let i = -4; i <= 4; i++) {
        const sx = x + i * (w * 0.12);
        ctx.beginPath();
        ctx.moveTo(sx, y + h * 0.25);
        ctx.lineTo(sx + w * 0.25, y + h * 0.65);
        ctx.stroke();
      }
      ctx.restore();
    }

    return true;
  });

  registerProceduralSpriteRendererForPack(USER_PROCEDURAL_PACK_ID, 'tree', (args) => {
    const { ctx, x, y, w, h, rng, variant } = args;
    const cx = x + w * 0.5;
    const baseY = y + h * 0.9;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY, w * 0.10, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Trunk
    const trunkH = h * 0.18;
    ctx.fillStyle = variant === 'abandoned' ? '#4b5563' : '#8b5a2b';
    ctx.fillRect(cx - w * 0.02, baseY - trunkH, w * 0.04, trunkH);

    // Canopy
    const canopyY = baseY - trunkH - h * 0.12;
    const r1 = w * (0.08 + rng() * 0.05);
    const r2 = w * (0.10 + rng() * 0.06);

    const canopyColor =
      variant === 'construction'
        ? '#94a3b8'
        : variant === 'abandoned'
          ? '#64748b'
          : '#22c55e';

    ctx.save();
    ctx.fillStyle = canopyColor;
    ctx.globalAlpha = variant === 'abandoned' ? 0.8 : 0.95;

    ctx.beginPath();
    ctx.arc(cx, canopyY, r2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - r1 * 0.9, canopyY + r1 * 0.2, r1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + r1 * 0.9, canopyY + r1 * 0.2, r1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return true;
  });

  // ---------------------------------------------------------------------------
  // Global extension points (optional)
  // ---------------------------------------------------------------------------
  // These are examples that DO NOT change any existing sprites unless you
  // reference matching keys.
  //
  // Prefix example: reference sprites like `user:my_asset` from spriteOrder.
  registerProceduralPrefixRenderer('user', () => false);

  // Exact-key example (global): uncomment to replace sprites in ALL procedural packs.
  // registerProceduralSpriteRenderer('house_small', (args) => {
  //   // draw...
  //   return true;
  // });

  // Placeholder no-ops to make it obvious this file runs (and to keep tree-shaking honest).
  registerProceduralSpriteRenderer('__user_noop__', () => false);
}
