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
    width: number
    height: number
    depth: number
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

  const baseHeight = config.base.enabled ? mm(config.base.height) : 0

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
    // With a base, the panel sinks partway into the slot rather than balancing
    // on top of it.
    panelCentreY: (config.base.enabled ? baseHeight * 0.45 : 0) + shape.panelHeight / 2,
    stackDepth: zOffsets.total,
    base: {
      width: shape.panelWidth * 1.15,
      height: baseHeight,
      depth: Math.max(mm(config.base.depth), zOffsets.total * 2.2),
    },
    layers,
    hole,
    hardwareAnchor,
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
  forLayer: (asset: ImageAsset | undefined) => Pick<LayerLayout, 'outline' | 'art' | 'offset'>
}

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

  // Rounded rectangle: one shared silhouette, artwork fitted inside it.
  const aspect = reference ? reference.width / reference.height : DEFAULT_ASPECT
  const panelWidth = panelHeight * aspect

  return {
    panelWidth,
    panelHeight,
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

  const referenceOutline = traceOutlineCached(
    reference.alphaMask,
    borderFractionFor(reference),
  )
  if (!referenceOutline) return null

  const refScale = metresPerUnitFor(reference)
  const refBounds = referenceOutline.bounds
  const shiftX = -((refBounds.minX + refBounds.maxX) / 2) * refScale
  const shiftY = -((refBounds.minY + refBounds.maxY) / 2) * refScale

  return {
    panelWidth: (refBounds.maxX - refBounds.minX) * refScale,
    panelHeight: (refBounds.maxY - refBounds.minY) * refScale,
    forLayer: (asset) => {
      if (!asset?.alphaMask.bounds) return { outline: null, art: null, offset: [0, 0] }

      const scale = metresPerUnitFor(asset)
      const outline = traceOutlineCached(asset.alphaMask, borderFractionFor(asset))

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
