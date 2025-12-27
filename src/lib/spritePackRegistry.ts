// Sprite pack registry helpers
// -----------------------------------------------------------------------------
// IsoCity ships with a few built-in sprite packs defined in `renderConfig.ts`.
//
// This module adds a small (optional) "registry" layer so you can *insert* new
// sprite packs (including procedurally generated packs) from your own code
// without having to edit the core pack list manually.
//
// Typical usage (in `src/lib/proceduralUserAssets.ts`):
//
//   import { registerProceduralSpritePack } from '@/lib/spritePackRegistry';
//
//   registerProceduralSpritePack('sprites4', {
//     id: 'procedural-user',
//     name: 'Procedural (User)',
//     seed: 2025,
//   });
//
// This pushes the pack into the exported `SPRITE_PACKS` array so it shows up in
// the Settings UI and works with `getSpritePack(...)`.
//
// NOTE: `SPRITE_PACKS` is exported as a `const` array, but arrays are mutable.
// We rely on that to keep the integration minimal and non-invasive.

import type { SpritePack } from '@/lib/renderConfig';
import { SPRITE_PACKS, getSpritePack } from '@/lib/renderConfig';

export type RegisterSpritePackOptions = {
  /** If true, overwrite an existing pack with the same id (default: false). */
  replace?: boolean;
};

export function registerSpritePack(pack: SpritePack, options?: RegisterSpritePackOptions): void {
  const idx = SPRITE_PACKS.findIndex((p) => p.id === pack.id);
  if (idx >= 0) {
    if (options?.replace) {
      // Preserve array reference while replacing contents.
      SPRITE_PACKS[idx] = pack;
    }
    return;
  }
  SPRITE_PACKS.push(pack);
}

export type ProceduralSpritePackOptions = {
  /** Unique id for the new pack (used in `procedural:${id}:...` cache keys). */
  id: string;
  /** Display name shown in Settings. */
  name: string;

  /** Optional deterministic seed (changes the look). */
  seed?: number;

  /** Cell size for generated sheets (defaults: 256x213). */
  tileWidth?: number;
  tileHeight?: number;

  /** Optional preview image (data URI or URL). If omitted, a small SVG is generated. */
  previewSrc?: string;
};

function encodeSvgDataUri(svg: string): string {
  // Keep this small and deterministic; GitHub renders it fine in the UI.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defaultProceduralPreviewSvg(label: string): string {
  const safe = label.replace(/[<>]/g, '');
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" viewBox="0 0 256 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect width="256" height="128" fill="#0b1220"/>
  <rect x="12" y="12" width="232" height="104" rx="12" fill="url(#g)" opacity="0.18"/>
  <path d="M64 88 L128 48 L192 88 L128 112 Z" fill="url(#g)" opacity="0.55"/>
  <path d="M64 88 L128 48 L128 112 L64 88 Z" fill="#ffffff" opacity="0.10"/>
  <path d="M192 88 L128 48 L128 112 L192 88 Z" fill="#000000" opacity="0.15"/>
  <text x="20" y="34" fill="#e2e8f0" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="600">
    Procedural
  </text>
  <text x="20" y="54" fill="#cbd5e1" font-family="ui-sans-serif, system-ui" font-size="12">
    ${safe}
  </text>
</svg>`.trim();
  return encodeSvgDataUri(svg);
}

/**
 * Create a SpritePack that uses procedurally generated sheets while inheriting
 * layout/mappings/offsets from a base pack.
 *
 * This is the easiest way to add a brand-new procedural style without having to
 * author a full SpritePack by hand.
 */
export function createProceduralSpritePackFromBase(basePack: SpritePack, opts: ProceduralSpritePackOptions): SpritePack {
  const tileWidth = opts.tileWidth ?? basePack.procedural?.tileWidth ?? 256;
  const tileHeight = opts.tileHeight ?? basePack.procedural?.tileHeight ?? 213;

  const hasDense = !!basePack.denseVariants;
  const hasModern = !!basePack.modernVariants;
  const hasParks = !!basePack.parksBuildings;
  const hasFarms = !!basePack.farmsVariants;
  const hasShops = !!basePack.shopsVariants;
  const hasStations = !!basePack.stationsVariants;

  return {
    ...basePack,
    id: opts.id,
    name: opts.name,
    previewSrc: opts.previewSrc ?? defaultProceduralPreviewSvg(opts.name),

    // Cache-key sources (NOT URLs)
    src: `procedural:${opts.id}:main`,
    constructionSrc: `procedural:${opts.id}:construction`,
    abandonedSrc: `procedural:${opts.id}:abandoned`,

    // Optional extra sheets if the base pack supports them
    denseSrc: hasDense ? `procedural:${opts.id}:dense` : basePack.denseSrc,
    modernSrc: hasModern ? `procedural:${opts.id}:modern` : basePack.modernSrc,
    parksSrc: hasParks ? `procedural:${opts.id}:parks` : basePack.parksSrc,
    parksConstructionSrc: hasParks ? `procedural:${opts.id}:parksConstruction` : basePack.parksConstructionSrc,
    farmsSrc: hasFarms ? `procedural:${opts.id}:farms` : basePack.farmsSrc,
    shopsSrc: hasShops ? `procedural:${opts.id}:shops` : basePack.shopsSrc,
    stationsSrc: hasStations ? `procedural:${opts.id}:stations` : basePack.stationsSrc,

    procedural: {
      tileWidth,
      tileHeight,
      seed: opts.seed ?? basePack.procedural?.seed ?? 0,
    },
  };
}

/**
 * Convenience wrapper: create + register a procedural pack derived from an
 * existing pack id.
 */
export function registerProceduralSpritePack(
  basePackId: string,
  opts: ProceduralSpritePackOptions,
  registerOptions?: RegisterSpritePackOptions
): SpritePack {
  const base = getSpritePack(basePackId);
  const pack = createProceduralSpritePackFromBase(base, opts);
  registerSpritePack(pack, registerOptions);
  return pack;
}
