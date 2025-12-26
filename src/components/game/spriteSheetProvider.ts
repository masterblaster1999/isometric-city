// Sprite sheet provider
// -----------------------------------------------------------------------------
// Centralizes how the renderer obtains sprite sheets.
//
// - For traditional packs, sheets are loaded from .png/.webp files.
// - For procedural packs, sheets are generated at runtime and registered into
//   the same image cache so the rendering pipeline can remain unchanged.

import type { SpritePack } from '@/lib/renderConfig';
import { loadSpriteImage, registerGeneratedImage, isImageCached } from '@/components/game/imageLoader';
import { generateProceduralSpriteSheet, isProceduralSpritePack, type ProceduralSpriteSheetVariant } from '@/lib/proceduralSpriteSheets';

export type SpriteSheetKind =
  | 'main'
  | 'construction'
  | 'abandoned'
  | 'dense'
  | 'modern'
  | 'parks'
  | 'parksConstruction'
  | 'farms'
  | 'shops'
  | 'stations';

export function getSpriteSheetSrc(pack: SpritePack, kind: SpriteSheetKind): string | undefined {
  switch (kind) {
    case 'main':
      return pack.src;
    case 'construction':
      return pack.constructionSrc;
    case 'abandoned':
      return pack.abandonedSrc;
    case 'dense':
      return pack.denseSrc;
    case 'modern':
      return pack.modernSrc;
    case 'parks':
      return pack.parksSrc;
    case 'parksConstruction':
      return pack.parksConstructionSrc;
    case 'farms':
      return pack.farmsSrc;
    case 'shops':
      return pack.shopsSrc;
    case 'stations':
      return pack.stationsSrc;
    default:
      return undefined;
  }
}

function kindToProceduralVariant(kind: SpriteSheetKind): ProceduralSpriteSheetVariant | null {
  if (kind === 'main') return 'main';
  if (kind === 'construction') return 'construction';
  if (kind === 'abandoned') return 'abandoned';
  return null;
}

/**
 * Ensure a sprite sheet is available for the given pack.
 *
 * For procedural packs, this generates the sheet and registers it in the cache.
 * For file-based packs, it loads the image (and optionally applies background filtering).
 */
export async function ensureSpriteSheetLoaded(
  pack: SpritePack,
  kind: SpriteSheetKind,
  options?: { applyFilter?: boolean }
): Promise<void> {
  const src = getSpriteSheetSrc(pack, kind);
  if (!src) return;

  // Procedural packs: generate and register.
  if (isProceduralSpritePack(pack)) {
    const variant = kindToProceduralVariant(kind);
    if (!variant) {
      // Not supported by the basic procedural generator yet.
      return;
    }

    // If either the raw key or filtered key is cached, we're done.
    if (isImageCached(src, false) || isImageCached(src, true)) {
      return;
    }

    const sheet = generateProceduralSpriteSheet(pack, variant);

    // Register under both keys so the renderer's `getCachedImage(src, true)` path works.
    registerGeneratedImage(src, sheet, { alsoRegisterFiltered: true });
    return;
  }

  // File-based packs
  const applyFilter = options?.applyFilter ?? true;
  await loadSpriteImage(src, applyFilter);
}
