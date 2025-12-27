// Sprite sheet provider
// -----------------------------------------------------------------------------
// Centralizes how the renderer obtains sprite sheets.
//
// - For traditional packs, sheets are loaded from .png/.webp files.
// - For procedural packs, sheets are generated at runtime and registered into
//   the same image cache so the rendering pipeline can remain unchanged.
// - Optional: you can force or fallback to procedural generation for *any* pack
//   via `NEXT_PUBLIC_PROCEDURAL_ASSETS_MODE` (see `src/lib/proceduralAssetsMode.ts`).

import type { SpritePack } from '@/lib/renderConfig';
import { isImageCached, loadSpriteImage, registerGeneratedImage } from '@/components/game/imageLoader';
import { getProceduralAssetsMode, type ProceduralAssetsMode } from '@/lib/proceduralAssetsMode';
import { generateProceduralSpriteSheetForKind, isProceduralSpritePack } from '@/lib/proceduralSpriteSheets';

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

/**
 * Ensure a sprite sheet is available for the given pack.
 *
 * For procedural packs, this generates the sheet and registers it in the cache.
 * For file-based packs, it loads the image (and optionally applies background filtering).
 *
 * You can optionally:
 * - force procedural generation, even for file packs (mode: 'force')
 * - fallback to procedural generation if loading fails (mode: 'fallback')
 */
export async function ensureSpriteSheetLoaded(
  pack: SpritePack,
  kind: SpriteSheetKind,
  options?: {
    applyFilter?: boolean;
    mode?: ProceduralAssetsMode;
    forceProcedural?: boolean;
    fallbackToProcedural?: boolean;
  }
): Promise<void> {
  const src = getSpriteSheetSrc(pack, kind);
  if (!src) return;

  const mode = options?.mode ?? getProceduralAssetsMode();
  const forceProcedural = options?.forceProcedural ?? mode === 'force';
  const fallbackToProcedural = options?.fallbackToProcedural ?? mode === 'fallback';

  // Procedural packs: generate and register.
  // We also treat `src` values starting with `procedural:` as procedural, even if
  // the pack forgot to set `pack.procedural`.
  if (forceProcedural || isProceduralSpritePack(pack) || src.startsWith('procedural:')) {
    // If either the raw key or filtered key is cached, we're done.
    if (isImageCached(src, false) || isImageCached(src, true)) {
      return;
    }

    const sheet = generateProceduralSpriteSheetForKind(pack, kind);
    if (!sheet) return;

    // Register under both keys so the renderer's `getCachedImage(src, true)` path works.
    registerGeneratedImage(src, sheet, { alsoRegisterFiltered: true });
    return;
  }

  // File-based packs
  const applyFilter = options?.applyFilter ?? true;
  try {
    await loadSpriteImage(src, applyFilter);
  } catch (err) {
    if (!fallbackToProcedural) throw err;

    // Fallback: generate and register a procedural sheet under the same cache key
    // so the rest of the pipeline can keep using `pack.src` etc unchanged.
    if (!isImageCached(src, false) && !isImageCached(src, true)) {
      const sheet = generateProceduralSpriteSheetForKind(pack, kind);
      if (sheet) {
        registerGeneratedImage(src, sheet, { alsoRegisterFiltered: true });
        return;
      }
    }

    // If we couldn't generate a fallback, surface the original load error.
    throw err;
  }
}
