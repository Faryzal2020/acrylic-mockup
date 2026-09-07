import { CONFIG_VERSION, createDefaultConfig, type MockupConfig } from '../types/config'
import { triggerDownload, timestampedFilename } from './exportImage'

export type PresetFile = {
  kind: 'acrylic-mockup-preset'
  version: number
  savedAt: string
  /**
   * Names of the PNGs this preset was built with. Image data is NOT included —
   * it would balloon the file and there is no server to hold it — so this is a
   * reminder of which files to re-upload.
   */
  artwork: string[]
  config: MockupConfig
}

export function exportPreset(config: MockupConfig, artwork: string[]) {
  const preset: PresetFile = {
    kind: 'acrylic-mockup-preset',
    version: CONFIG_VERSION,
    savedAt: new Date().toISOString(),
    artwork,
    config,
  }

  triggerDownload(
    new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' }),
    timestampedFilename('acrylic-preset', 'json'),
  )
}

export type ImportResult =
  | { ok: true; config: MockupConfig; artwork: string[] }
  | { ok: false; error: string }

/**
 * Reads a preset back. Deliberately forgiving: it merges over a default config
 * rather than trusting the file's shape, so a preset written by an older build
 * still loads with sensible values for anything it predates.
 */
export async function importPreset(file: File): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  if (!isRecord(parsed) || parsed.kind !== 'acrylic-mockup-preset') {
    return { ok: false, error: 'That is not an acrylic mockup preset.' }
  }
  if (!isRecord(parsed.config)) {
    return { ok: false, error: 'The preset has no configuration in it.' }
  }

  const defaults = createDefaultConfig()
  const incoming = parsed.config as Partial<MockupConfig>

  const config: MockupConfig = {
    ...defaults,
    ...incoming,
    version: CONFIG_VERSION,
    panel: { ...defaults.panel, ...incoming.panel },
    base: { ...defaults.base, ...incoming.base },
    hardware: { ...defaults.hardware, ...incoming.hardware },
    material: { ...defaults.material, ...incoming.material },
    camera: { ...defaults.camera, ...incoming.camera },
    lighting: { ...defaults.lighting, ...incoming.lighting },
    background: { ...defaults.background, ...incoming.background },
    // Artwork lives in this session only, so every layer comes back unassigned
    // and the user re-points them at re-uploaded PNGs.
    layers: Array.isArray(incoming.layers) && incoming.layers.length
      ? incoming.layers.map((layer, index) => ({
          ...defaults.layers[0],
          ...layer,
          id: crypto.randomUUID(),
          gapBefore: index === 0 ? 0 : (layer.gapBefore ?? 0),
          imageAssetId: null,
          imagePlacement: { ...defaults.layers[0].imagePlacement, ...layer.imagePlacement },
        }))
      : defaults.layers,
  }

  return {
    ok: true,
    config,
    artwork: Array.isArray(parsed.artwork) ? parsed.artwork.filter(isString) : [],
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'
