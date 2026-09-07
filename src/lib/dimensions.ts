import type { ImageAsset } from '../store/configStore'
import { traceOutlineCached } from './outlineTrace'
import type { AcrylicLayer, MockupConfig } from '../types/config'
import { MM, mm } from './units'

/** Fallback panel proportion before any artwork is uploaded. */
const DEFAULT_ASPECT = 0.7
/** Artwork never runs all the way to the cut edge on a rectangular panel. */
const ART_MARGIN = 0.92

/** Everything one layer's meshes need, already resolved to metres. */
export type LayerLayout = {
  id: string
  /**
   * Cut pieces in layer-local metres, one closed polygon each; null means use
   * the shared rounded rect.
   */
  outline: { x: number; y: number }[][] | null
  /** Print plane size in layer-local metres; null when the layer has no art. */
  art: { width: number; height: number } | null
  /** Layer-local offset in metres, before placement. */
  offset: [number, number]
  /** Placement transform applied to the cut and the print together. */
  placement: { x: number; y: number; scale: number; rotation: number }
  thickness: number
  zOffset: number
}

export type SceneDimensions = {
  /** metres */
  panelWidth: number
  panelHeight: number
  cornerRadius: number
  /** Centre of the panel above the floor, in metres. */
  panelCentreY: number
  /** Total front-to-back depth of the whole layer stack, in metres. */
  stackDepth: number
  base: {
    /** Across the base, in metres. */
    width: number
    /** Front-to-back, in metres. Equal to width for a circular base. */
    depth: number
    /** Sheet thickness of the base plate, in metres. */
    thickness: number
    /** The cut-out the standee's tab drops through, in base-local metres. */
    slot: { x: number; width: number; depth: number } | null
    /**
     * Base plate cut to its own artwork, in base-local metres — one closed
     * polygon per piece. Null falls back to the circle/rectangle shapes.
     *
     * Base-local means the flat shape space the plate is extruded in, where x
     * is world x and y is world -z, so the artwork reads as a plan view.
     */
    outline: { x: number; y: number }[][] | null
    /** Where that artwork prints on the top face, in the same space. */
    art: { width: number; height: number; x: number; y: number } | null
  }
  layers: LayerLayout[]
  /**
   * Keyring through-hole, in panel-local metres. Null when the product has no
   * hardware that needs one.
   */
  hole: { x: number; y: number; radius: number } | null
  /** Where hardware attaches, in panel-local metres. */
  hardwareAnchor: { x: number; y: number }
}

export function getSceneDimensions(
  config: MockupConfig,
  assets: Record<string, ImageAsset>,
): SceneDimensions {
  const zOffsets = getLayerZOffsets(config.layers)
  const shape = getPanelShape(config, assets)

  const layers: LayerLayout[] = config.layers.map((layer, index) => {
    const asset = layer.imageAssetId ? assets[layer.imageAssetId] : undefined
    return {
      id: layer.id,
      ...shape.forLayer(asset),
      placement: layer.imagePlacement,
      thickness: mm(layer.thickness),
      zOffset: zOffsets.offsets[index],
    }
  })

  const baseThickness = config.base.enabled ? mm(config.base.thickness) : 0
  const basePlate = getBasePlate(config, assets)

  const hardwareAnchor = {
    x: (config.hardware.position.x - 0.5) * shape.panelWidth,
    y: (config.hardware.position.y - 0.5) * shape.panelHeight,
  }
  const hole =
    config.hardware.type === 'keyring'
      ? { ...hardwareAnchor, radius: mm(config.hardware.holeDiameter) / 2 }
      : null

  return {
    panelWidth: shape.panelWidth,
    panelHeight: shape.panelHeight,
    cornerRadius: mm(config.panel.cornerRadiusMm),
    // The silhouette rests on the top face of the base plate; only the tab
    // goes below, down through the slot.
    panelCentreY: baseThickness + shape.panelHeight / 2,
    stackDepth: zOffsets.total,
    base: {
      ...basePlate,
      thickness: baseThickness,
      // Slot depth is only knowable here, once the stack's total depth is:
      // one slot has to swallow every layer's tab. 0.6mm of clearance keeps
      // the cut visible rather than z-fighting the acrylic.
      slot: shape.slot && { ...shape.slot, depth: zOffsets.total + mm(0.6) },
    },
    layers,
    hole,
    hardwareAnchor,
  }
}

/**
 * The base plate's footprint. With artwork assigned it is cut to that
 * artwork's alpha, read as a plan view; otherwise it is a plain disc or
 * rectangle. `base.diameter` sizes it across in either case.
 */
function getBasePlate(config: MockupConfig, assets: Record<string, ImageAsset>) {
  const across = mm(config.base.diameter)
  const asset = config.base.imageAssetId ? assets[config.base.imageAssetId] : undefined

  const plain = {
    width: across,
    depth: config.base.shape === 'circle' ? across : across * 0.5,
    outline: null,
    art: null,
  }

  if (config.base.shape !== 'traceFromAlpha' || !asset?.alphaMask.bounds) return plain

  // No border dilation here: the uploaded artwork *is* the intended footprint,
  // unlike the panel where the lip is a deliberate manufacturing allowance.
  const traced = traceOutlineCached(asset.alphaMask, 0)
  if (!traced) return plain

  const { minX, maxX, minY, maxY } = traced.bounds
  const spanX = maxX - minX
  if (spanX <= 0) return plain

  const scale = across / spanX
  const centreX = (minX + maxX) / 2
  const centreY = (minY + maxY) / 2

  return {
    width: across,
    depth: (maxY - minY) * scale,
    outline: traced.contours.map((contour) =>
      contour.map((p) => ({ x: (p.x - centreX) * scale, y: (p.y - centreY) * scale })),
    ),
    art: {
      width: (asset.width / asset.height) * scale,
      height: scale,
      x: -centreX * scale,
      y: -centreY * scale,
    },
  }
}

function getLayerZOffsets(layers: AcrylicLayer[]) {
  const offsets: number[] = []
  let cursor = 0

  layers.forEach((layer, index) => {
    const gap = index === 0 ? 0 : mm(layer.gapBefore)
    const thickness = mm(layer.thickness)
    cursor += gap
    offsets.push(cursor + thickness / 2)
    cursor += thickness
  })

  // Re-centre the stack on z = 0 so the camera presets stay valid as layers
  // are added and removed.
  for (let i = 0; i < offsets.length; i++) offsets[i] -= cursor / 2

  return { offsets, total: cursor }
}

type PanelShape = {
  panelWidth: number
  panelHeight: number
  slot: SceneDimensions['base']['slot']
  forLayer: (asset: ImageAsset | undefined) => Pick<LayerLayout, 'outline' | 'art' | 'offset'>
}

/**
 * How far a layer's silhouette bottom may sit above the panel bottom and still
 * count as a piece that reaches the base. Body layers get a mounting tab;
 * a floating detail layer — a pair of eyes — does not.
 */
const TAB_REACH = 0.15
/** How far the tab overlaps up into the silhouette so the two merge as one island. */
const TAB_OVERLAP = 0.06

function getPanelShape(
  config: MockupConfig,
  assets: Record<string, ImageAsset>,
): PanelShape {
  const panelHeight = mm(config.panel.heightMm)

  // The first layer carrying artwork is the reference: it sets the physical
  // scale and the centring for the whole stack, so a smaller foreground layer
  // renders smaller rather than being blown up to match.
  const reference = config.layers
    .map((l) => (l.imageAssetId ? assets[l.imageAssetId] : null))
    .find((asset): asset is ImageAsset => Boolean(asset))

  const traced =
    config.panel.shape === 'traceFromAlpha' && reference?.alphaMask.bounds
      ? getTracedShape(config, reference)
      : null

  if (traced) return traced

  // Rounded rectangle: one shared silhouette, artwork fitted inside it. A
  // rectangular panel needs no tab — its whole bottom edge is the tab, so the
  // slot simply spans the panel.
  const aspect = reference ? reference.width / reference.height : DEFAULT_ASPECT
  const panelWidth = panelHeight * aspect

  return {
    panelWidth,
    panelHeight,
    slot: config.base.enabled
      ? { x: 0, width: panelWidth * 0.7, depth: 0 }
      : null,
    forLayer: (asset) => ({
      outline: null,
      art: asset ? fitArtwork(asset, panelWidth, panelHeight) : null,
      offset: [0, 0],
    }),
  }
}

function getTracedShape(config: MockupConfig, reference: ImageAsset): PanelShape | null {
  const bounds = reference.alphaMask.bounds
  if (!bounds) return null

  const borderMm = Math.max(0, config.panel.borderMm)
  // Artwork height in the reference image's own space, where the image is 1 tall.
  const artHeight = bounds.maxY - bounds.minY
  if (artHeight <= 0) return null

  // `panel.heightMm` is the finished height, border included, but the border is
  // a dilation applied before tracing. Dilating by b grows the height by 2b, so
  // the millimetres-per-source-pixel scale falls out directly:
  //   heightMm = artHeight * pixels * mmPerPixel + 2 * borderMm
  const mmPerPixel =
    (config.panel.heightMm - 2 * borderMm) / (artHeight * reference.height)
  if (!(mmPerPixel > 0)) return null

  // Every layer is traced in its own image space but scaled through the same
  // millimetres-per-pixel, so layers exported from one canvas line up exactly.
  const borderFractionFor = (asset: ImageAsset) => borderMm / (asset.height * mmPerPixel)
  const metresPerUnitFor = (asset: ImageAsset) => asset.height * mmPerPixel * MM

  const refScale = metresPerUnitFor(reference)

  // Dilating by b grows the bounding box by exactly b on every side, so the
  // silhouette's extent is known without tracing. Taking it from here rather
  // than from the traced contour is what keeps `panel.heightMm` meaning the
  // standee's height — the mounting tab hangs below it and must not count.
  const silhouetteOf = (asset: ImageAsset) => {
    const b = asset.alphaMask.bounds
    if (!b) return null
    const border = borderFractionFor(asset)
    return {
      minX: b.minX - border,
      maxX: b.maxX + border,
      minY: b.minY - border,
      maxY: b.maxY + border,
    }
  }

  const refSilhouette = silhouetteOf(reference)
  if (!refSilhouette) return null

  const shiftX = -((refSilhouette.minX + refSilhouette.maxX) / 2) * refScale
  const shiftY = -((refSilhouette.minY + refSilhouette.maxY) / 2) * refScale
  const panelHeightM = (refSilhouette.maxY - refSilhouette.minY) * refScale

  const tabWidthMm = Math.max(0, config.panel.tabWidthMm)
  const tabLengthMm = config.base.thickness

  const tabFor = (asset: ImageAsset) => {
    if (!config.base.enabled || tabWidthMm <= 0) return null

    const silhouette = silhouetteOf(asset)
    if (!silhouette) return null

    // Only pieces that actually come down to the base get one.
    const bottomGap = ((silhouette.minY - refSilhouette.minY) * refScale) / panelHeightM
    if (bottomGap > TAB_REACH) return null

    const unitsPerMm = 1 / (asset.height * mmPerPixel)
    const artHeight = silhouette.maxY - silhouette.minY

    return {
      width: tabWidthMm * unitsPerMm,
      centreX: (silhouette.minX + silhouette.maxX) / 2,
      top: silhouette.minY + artHeight * TAB_OVERLAP,
      bottom: silhouette.minY - tabLengthMm * unitsPerMm,
    }
  }

  const slotTab = tabFor(reference)

  return {
    panelWidth: (refSilhouette.maxX - refSilhouette.minX) * refScale,
    panelHeight: panelHeightM,
    slot: slotTab
      ? {
          x: slotTab.centreX * refScale + shiftX,
          width: slotTab.width * refScale,
          depth: 0,
        }
      : null,
    forLayer: (asset) => {
      if (!asset?.alphaMask.bounds) return { outline: null, art: null, offset: [0, 0] }

      const scale = metresPerUnitFor(asset)
      const outline = traceOutlineCached(
        asset.alphaMask,
        borderFractionFor(asset),
        tabFor(asset),
      )

      return {
        outline: outline
          ? outline.contours.map((contour) =>
              contour.map((p) => ({ x: p.x * scale, y: p.y * scale })),
            )
          : null,
        art: { width: (asset.width / asset.height) * scale, height: scale },
        offset: [shiftX, shiftY],
      }
    },
  }
}

/** Largest copy of the artwork that fits inside a rectangular panel. */
function fitArtwork(asset: ImageAsset, panelWidth: number, panelHeight: number) {
  const aspect = asset.width / asset.height
  let height = panelHeight * ART_MARGIN
  let width = height * aspect
  const maxWidth = panelWidth * ART_MARGIN

  if (width > maxWidth) {
    width = maxWidth
    height = width / aspect
  }

  return { width, height }
}
