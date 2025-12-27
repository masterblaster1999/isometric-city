// Procedural sprite extensions
// -----------------------------------------------------------------------------
// The built-in procedural generator can draw a decent set of placeholder
// buildings/parks/utility sprites.
//
// This module adds a lightweight extension point so you can "inject" your own
// procedurally generated assets without having to fork `proceduralSpriteSheets.ts`.
//
// There are TWO ways to extend:
//
// 1) Prefix-based renderers (good for "new" assets)
//    registerProceduralPrefixRenderer('my', ({ ctx, key, ... }) => { ...; return true; })
//    Then reference sprites like `my:whatever` from a SpritePack's spriteOrder.
//
// 2) Exact-key overrides (good for replacing existing sprites)
//    registerProceduralSpriteRenderer('house_small', (args) => { ...; return true; })
//
// Additionally, you can scope registrations to a specific SpritePack id so you can
// have multiple procedural styles co-exist without global overrides:
//    registerProceduralSpriteRendererForPack('procedural-user', 'house_small', ...)

import type { SpritePack } from '@/lib/renderConfig';
import type { ProceduralSpriteSheetKind, ProceduralSpriteSheetVariant } from '@/lib/proceduralSpriteSheets';

export type ProceduralPrefixRenderArgs = {
  /** The sprite pack currently generating the sheet. */
  pack: SpritePack;
  /** Which sheet kind is being generated (main/dense/parks/etc). */
  sheetKind: ProceduralSpriteSheetKind;

  /** Raw sprite key passed to the generator (may include a prefix like "my:foo"). */
  spriteKey: string;
  /** Prefix portion (the part before ':'). */
  prefix: string;
  /** Base key portion (the part after ':'). */
  key: string;

  /** Variant of the main-grid sheets (main/construction/abandoned). */
  variant: ProceduralSpriteSheetVariant;

  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  w: number;
  h: number;

  /** Deterministic RNG seeded per-cell. */
  rng: () => number;
};

/**
 * A renderer can draw directly into the cell and return `true` to mark the
 * sprite as handled. Returning `false`/`undefined` will fall back to the built-in
 * generator.
 */
export type ProceduralPrefixRenderer = (args: ProceduralPrefixRenderArgs) => boolean | void;

// Global registries
const prefixRenderers = new Map<string, ProceduralPrefixRenderer>();
const spriteKeyRenderers = new Map<string, ProceduralPrefixRenderer>();

// Pack-scoped registries
const prefixRenderersByPack = new Map<string, Map<string, ProceduralPrefixRenderer>>();
const spriteKeyRenderersByPack = new Map<string, Map<string, ProceduralPrefixRenderer>>();

function getPackMap<K, V>(root: Map<string, Map<K, V>>, packId: string): Map<K, V> {
  let m = root.get(packId);
  if (!m) {
    m = new Map<K, V>();
    root.set(packId, m);
  }
  return m;
}

/**
 * Register a renderer for a sprite-key prefix (the part before ':').
 */
export function registerProceduralPrefixRenderer(prefix: string, renderer: ProceduralPrefixRenderer): void {
  prefixRenderers.set(prefix, renderer);
}

export function unregisterProceduralPrefixRenderer(prefix: string): void {
  prefixRenderers.delete(prefix);
}

export function getProceduralPrefixRenderer(prefix: string, packId?: string): ProceduralPrefixRenderer | undefined {
  if (packId) {
    const packMap = prefixRenderersByPack.get(packId);
    const scoped = packMap?.get(prefix);
    if (scoped) return scoped;
  }
  return prefixRenderers.get(prefix);
}

export function listProceduralPrefixRenderers(): string[] {
  return Array.from(prefixRenderers.keys());
}

/**
 * Register a renderer for a specific sprite key (exact match).
 *
 * This is useful when you want to override a built-in procedural sprite without
 * having to edit a SpritePack's `spriteOrder` to add a prefix.
 */
export function registerProceduralSpriteRenderer(spriteKey: string, renderer: ProceduralPrefixRenderer): void {
  spriteKeyRenderers.set(spriteKey, renderer);
}

export function unregisterProceduralSpriteRenderer(spriteKey: string): void {
  spriteKeyRenderers.delete(spriteKey);
}

export function getProceduralSpriteRenderer(spriteKey: string, packId?: string): ProceduralPrefixRenderer | undefined {
  if (packId) {
    const packMap = spriteKeyRenderersByPack.get(packId);
    const scoped = packMap?.get(spriteKey);
    if (scoped) return scoped;
  }
  return spriteKeyRenderers.get(spriteKey);
}

export function listProceduralSpriteRenderers(): string[] {
  return Array.from(spriteKeyRenderers.keys());
}

export function clearProceduralSpriteRenderers(): void {
  spriteKeyRenderers.clear();
}

// -----------------------------------------------------------------------------
// Pack-scoped helpers
// -----------------------------------------------------------------------------

export function registerProceduralPrefixRendererForPack(
  packId: string,
  prefix: string,
  renderer: ProceduralPrefixRenderer
): void {
  getPackMap(prefixRenderersByPack, packId).set(prefix, renderer);
}

export function unregisterProceduralPrefixRendererForPack(packId: string, prefix: string): void {
  prefixRenderersByPack.get(packId)?.delete(prefix);
}

export function registerProceduralSpriteRendererForPack(
  packId: string,
  spriteKey: string,
  renderer: ProceduralPrefixRenderer
): void {
  getPackMap(spriteKeyRenderersByPack, packId).set(spriteKey, renderer);
}

export function unregisterProceduralSpriteRendererForPack(packId: string, spriteKey: string): void {
  spriteKeyRenderersByPack.get(packId)?.delete(spriteKey);
}

export function clearProceduralRenderersForPack(packId: string): void {
  prefixRenderersByPack.delete(packId);
  spriteKeyRenderersByPack.delete(packId);
}

export function listProceduralPrefixRenderersForPack(packId: string): string[] {
  return Array.from(prefixRenderersByPack.get(packId)?.keys() ?? []);
}

export function listProceduralSpriteRenderersForPack(packId: string): string[] {
  return Array.from(spriteKeyRenderersByPack.get(packId)?.keys() ?? []);
}
