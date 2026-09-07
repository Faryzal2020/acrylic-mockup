import { create } from 'zustand'
import type * as THREE from 'three'
import type { AlphaMask } from '../lib/alphaMask'
import {
  createDefaultConfig,
  createLayer,
  PRODUCT_DEFAULTS,
  type AcrylicLayer,
  type MockupConfig,
  type ProductType,
} from '../types/config'

/**
 * An uploaded PNG. Lives for the session only — there is no server to persist
 * to, so a reload loses these and the user has to re-upload alongside their
 * exported preset JSON.
 */
export type ImageAsset = {
  id: string
  name: string
  url: string
  width: number
  height: number
  texture: THREE.Texture
  /** Downsampled alpha channel, used to trace the cut line. */
  alphaMask: AlphaMask
}

type ConfigState = {
  config: MockupConfig
  assets: Record<string, ImageAsset>

  /** Shallow patch of the top-level config. */
  setConfig: (patch: Partial<MockupConfig>) => void
  /** Patch one nested section, e.g. `patchSection('material', { ior: 1.6 })`. */
  patchSection: <K extends SectionKey>(key: K, patch: Partial<MockupConfig[K]>) => void

  patchLayer: (id: string, patch: Partial<AcrylicLayer>) => void
  addLayer: () => string
  duplicateLayer: (id: string) => string | null
  removeLayer: (id: string) => void
  moveLayer: (id: string, direction: -1 | 1) => void

  addAsset: (asset: ImageAsset) => void
  /** Assigns the base's artwork; a non-null id also switches the base to tracing. */
  setBaseArtwork: (assetId: string | null) => void
  removeAsset: (id: string) => void

  setProductType: (productType: ProductType) => void
  replaceConfig: (config: MockupConfig) => void
  resetConfig: () => void
}

type SectionKey = {
  [K in keyof MockupConfig]: MockupConfig[K] extends object
    ? MockupConfig[K] extends unknown[]
      ? never
      : K
    : never
}[keyof MockupConfig]

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: createDefaultConfig(),
  assets: {},

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  patchSection: (key, patch) =>
    set((s) => ({
      config: { ...s.config, [key]: { ...s.config[key], ...patch } },
    })),

  patchLayer: (id, patch) =>
    set((s) => ({
      config: {
        ...s.config,
        layers: s.config.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      },
    })),

  addLayer: () => {
    const previous = get().config.layers.at(-1)
    const layer = createLayer({ gapBefore: 2, thickness: previous?.thickness ?? 3 })
    set((s) => ({ config: { ...s.config, layers: [...s.config.layers, layer] } }))
    return layer.id
  },

  duplicateLayer: (id) => {
    const source = get().config.layers.find((l) => l.id === id)
    if (!source) return null
    const copy = createLayer({ ...source, id: crypto.randomUUID() })
    set((s) => {
      const index = s.config.layers.findIndex((l) => l.id === id)
      const layers = [...s.config.layers]
      layers.splice(index + 1, 0, copy)
      layers[0] = { ...layers[0], gapBefore: 0 }
      return { config: { ...s.config, layers } }
    })
    return copy.id
  },

  removeLayer: (id) =>
    set((s) => {
      if (s.config.layers.length <= 1) return s
      const layers = s.config.layers.filter((l) => l.id !== id)
      // The first layer has nothing to be spaced from.
      layers[0] = { ...layers[0], gapBefore: 0 }
      return { config: { ...s.config, layers } }
    }),

  moveLayer: (id, direction) =>
    set((s) => {
      const from = s.config.layers.findIndex((l) => l.id === id)
      const to = from + direction
      if (from < 0 || to < 0 || to >= s.config.layers.length) return s
      const layers = [...s.config.layers]
      ;[layers[from], layers[to]] = [layers[to], layers[from]]
      layers[0] = { ...layers[0], gapBefore: 0 }
      return { config: { ...s.config, layers } }
    }),

  addAsset: (asset) => set((s) => ({ assets: { ...s.assets, [asset.id]: asset } })),

  setBaseArtwork: (assetId) =>
    set((s) => ({
      config: {
        ...s.config,
        base: {
          ...s.config.base,
          imageAssetId: assetId,
          // Giving the base artwork implies you want it cut to that artwork;
          // clearing it drops back to a plain disc.
          shape: assetId
            ? 'traceFromAlpha'
            : s.config.base.shape === 'traceFromAlpha'
              ? 'circle'
              : s.config.base.shape,
        },
      },
    })),

  removeAsset: (id) =>
    set((s) => {
      const { [id]: removed, ...rest } = s.assets
      if (removed) {
        removed.texture.dispose()
        URL.revokeObjectURL(removed.url)
      }
      const baseUsedIt = s.config.base.imageAssetId === id

      return {
        assets: rest,
        config: {
          ...s.config,
          layers: s.config.layers.map((l) =>
            l.imageAssetId === id ? { ...l, imageAssetId: null } : l,
          ),
          base: baseUsedIt
            ? {
                ...s.config.base,
                imageAssetId: null,
                shape: s.config.base.shape === 'traceFromAlpha' ? 'circle' : s.config.base.shape,
              }
            : s.config.base,
        },
      }
    }),

  setProductType: (productType) =>
    set((s) => {
      const defaults = PRODUCT_DEFAULTS[productType]
      return {
        config: {
          ...s.config,
          productType,
          panel: { ...s.config.panel, heightMm: defaults.panelHeightMm },
          base: { ...s.config.base, enabled: defaults.baseEnabled },
          hardware: {
            ...s.config.hardware,
            type: defaults.hardware,
            position: defaults.hardwarePosition,
          },
          // Framing is solved from the product's size, so re-aim at it.
          camera: { ...s.config.camera, preset: 'threeQuarter' },
        },
      }
    }),

  replaceConfig: (config) => set({ config }),
  resetConfig: () => set({ config: createDefaultConfig() }),
}))
