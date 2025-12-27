// Procedural assets mode
// -----------------------------------------------------------------------------
// Controls whether the renderer uses file-based sprite sheets (.png/.webp) or
// procedurally generated sprite sheets (Canvas 2D) at runtime.
//
// Modes:
// - off:      Always load sprite sheet image files (default).
// - fallback: Try to load image files; if loading fails, generate procedural sheets.
// - force:    Always generate procedural sheets (even for file-based packs).
//
// Configuration:
// - Build-time (recommended): set `NEXT_PUBLIC_PROCEDURAL_ASSETS_MODE` to
//   "off" | "fallback" | "force".
// - Runtime (browser): optionally override via localStorage key
//   "isocity-procedural-assets-mode" (useful for experiments / debugging).

export type ProceduralAssetsMode = 'off' | 'fallback' | 'force';

const STORAGE_KEY = 'isocity-procedural-assets-mode';

export function normalizeProceduralAssetsMode(value: unknown): ProceduralAssetsMode | null {
  if (typeof value !== 'string') return null;

  const v = value.trim().toLowerCase();

  if (v === 'off' || v === 'false' || v === '0' || v === 'disabled') return 'off';
  if (v === 'fallback' || v === 'auto') return 'fallback';
  if (v === 'force' || v === 'always' || v === 'on' || v === 'true' || v === '1') return 'force';

  return null;
}

export function getProceduralAssetsMode(): ProceduralAssetsMode {
  // Runtime override (browser)
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = normalizeProceduralAssetsMode(stored);
      if (parsed) return parsed;
    } catch {
      // Ignore storage access issues (privacy mode, etc.)
    }
  }

  // Build-time configuration (Next.js inlines NEXT_PUBLIC_* vars)
  const fromEnv = normalizeProceduralAssetsMode(process.env.NEXT_PUBLIC_PROCEDURAL_ASSETS_MODE);
  if (fromEnv) return fromEnv;

  // Back-compat / shorthand
  const fromEnv2 = normalizeProceduralAssetsMode(process.env.NEXT_PUBLIC_PROCEDURAL_ASSETS);
  if (fromEnv2) return fromEnv2;

  return 'off';
}

// Persist a localStorage override for the procedural assets mode.
function setStoredProceduralAssetsMode(mode: ProceduralAssetsMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

/**
 * Set a localStorage override for the procedural assets mode.
 *
 * This name is used by the Settings UI to avoid clashing with React state setters.
 */
export function setProceduralAssetsModeOverride(mode: ProceduralAssetsMode): void {
  setStoredProceduralAssetsMode(mode);
}

/**
 * Back-compat alias for older imports.
 */
export function setProceduralAssetsMode(mode: ProceduralAssetsMode): void {
  setStoredProceduralAssetsMode(mode);
}

export function clearProceduralAssetsModeOverride(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage access issues
  }
}
