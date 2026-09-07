/**
 * The single serializable object that describes an entire mockup.
 *
 * Everything the UI configures reduces to this shape, which is also the
 * on-disk format for exported preset JSON files. There is no backend, so this
 * object (plus the user's own source PNGs) is the only persistence story.
 *
 * Units: all lengths are millimetres. The scene converts with `MM` from
 * lib/units.ts.
 */
export type MockupConfig = {
  version: number
  productType: ProductType

  /** Overall panel silhouette, shared by every layer in the stack. */
  panel: {
    shape: PanelShape
    /** Overall height of the finished panel, border included. */
    heightMm: number
    cornerRadiusMm: number
    /** Clear lip cut outside the artwork, when tracing the silhouette. */
    borderMm: number
    /** Width of the tab that drops into the base's slot, in mm. */
    tabWidthMm: number
  }

  /** Ordered back-to-front along +Z. */
  layers: AcrylicLayer[]

  base: {
    enabled: boolean
    shape: BaseShape
    /** Sheet thickness of the base itself, in mm — it is cut from acrylic too. */
    thickness: number
    /** Across the base, in mm. Diameter for a circle, width otherwise. */
    diameter: number
    color: string
    imageOnBase: boolean
  }

  hardware: {
    type: HardwareType
    /** Normalised 0-1 across the panel, from bottom-left. */
    position: { x: number; y: number }
    /** Through-hole for a keyring, in mm. */
    holeDiameter: number
  }

  material: {
    finish: MaterialFinish
    tintColor: string
    ior: number
    roughness: number
    edgeGlow: number
  }

  camera: {
    preset: CameraPreset
    position?: [number, number, number]
    target?: [number, number, number]
  }

  lighting: {
    preset: LightingPreset
    environmentIntensity: number
  }

  background: {
    mode: BackgroundMode
    /** Used when mode is 'solid'. */
    color: string
  }
}

export type AcrylicLayer = {
  id: string
  /** mm. Drives ExtrudeGeometry depth and the material's `thickness`. */
  thickness: number
  /** mm gap from the previous layer. Ignored for the first layer. */
  gapBefore: number
  /** Reference into the in-memory asset store; null renders a blank panel. */
  imageAssetId: string | null
  imagePlacement: {
    x: number
    y: number
    scale: number
    rotation: number
  }
  imageMode: ImageMode
}

export type ProductType = 'standee' | 'keychain' | 'phoneGrip' | 'badge'
export type PanelShape = 'rounded' | 'traceFromAlpha'
export type BackgroundMode = 'studio' | 'solid' | 'transparent'
export type BaseShape = 'circle' | 'rectangle' | 'rounded'
export type HardwareType = 'none' | 'keyring' | 'popSocket'
export type MaterialFinish = 'clear' | 'frosted' | 'tinted'
export type CameraPreset = 'threeQuarter' | 'front' | 'edgeCloseup' | 'custom'
export type LightingPreset = 'studioSoft' | 'studioHard' | 'daylight'
export type ImageMode = 'surfacePrint' | 'sandwiched'

export const CONFIG_VERSION = 2

/**
 * What switching product type changes. Everything not listed — layers,
 * artwork, material, camera, lighting — is deliberately preserved, so trying
 * the same art as a standee and as a keychain is one click.
 */
export const PRODUCT_DEFAULTS: Record<ProductType, ProductDefaults> = {
  standee: {
    panelHeightMm: 150,
    baseEnabled: true,
    hardware: 'none',
    hardwarePosition: { x: 0.5, y: 0.92 },
  },
  keychain: {
    panelHeightMm: 60,
    baseEnabled: false,
    hardware: 'keyring',
    hardwarePosition: { x: 0.5, y: 0.93 },
  },
  phoneGrip: {
    panelHeightMm: 55,
    baseEnabled: false,
    hardware: 'popSocket',
    hardwarePosition: { x: 0.5, y: 0.45 },
  },
  badge: {
    panelHeightMm: 50,
    baseEnabled: false,
    hardware: 'none',
    hardwarePosition: { x: 0.5, y: 0.9 },
  },
}

export type ProductDefaults = {
  panelHeightMm: number
  baseEnabled: boolean
  hardware: HardwareType
  hardwarePosition: { x: number; y: number }
}

export function createLayer(overrides: Partial<AcrylicLayer> = {}): AcrylicLayer {
  return {
    id: crypto.randomUUID(),
    thickness: 3,
    gapBefore: 0,
    imageAssetId: null,
    imagePlacement: { x: 0, y: 0, scale: 1, rotation: 0 },
    imageMode: 'surfacePrint',
    ...overrides,
  }
}

export function createDefaultConfig(): MockupConfig {
  return {
    version: CONFIG_VERSION,
    productType: 'standee',
    panel: {
      shape: 'traceFromAlpha',
      heightMm: 150,
      cornerRadiusMm: 4,
      borderMm: 3,
      tabWidthMm: 24,
    },
    layers: [createLayer()],
    base: {
      enabled: true,
      shape: 'circle',
      // Cut from the same 3mm sheet as the panel, lying flat with a slot in it.
      thickness: 3,
      diameter: 70,
      color: '#d8d8d8',
      imageOnBase: false,
    },
    hardware: { type: 'none', position: { x: 0.5, y: 0.92 }, holeDiameter: 4 },
    material: {
      finish: 'clear',
      tintColor: '#bfe3e0',
      ior: 1.49,
      roughness: 0.05,
      edgeGlow: 0.35,
    },
    camera: { preset: 'threeQuarter' },
    lighting: { preset: 'studioSoft', environmentIntensity: 1 },
    background: { mode: 'studio', color: '#f2f2f2' },
  }
}
