/**
 * A downsampled alpha channel, extracted once per uploaded PNG.
 *
 * Contour tracing re-runs whenever the border width changes, so it works on
 * this small buffer rather than the full-resolution image. `data` is one byte
 * of alpha per pixel, row-major from the top-left.
 */
export type AlphaMask = {
  width: number
  height: number
  data: Uint8Array
  /**
   * Bounding box of the visible artwork in image space: the image spans
   * `width / height` wide by 1 tall, centred on the origin, y-up. Null when
   * the image is fully transparent.
   */
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null
}

/** Alpha at or above this counts as artwork, for both bounds and tracing. */
export const ALPHA_THRESHOLD = 128

/** Longest edge of the working mask. Enough detail for a cut line, cheap to trace. */
export const MASK_MAX_EDGE = 320

/**
 * @param sourceIsFlipped true when the bitmap was decoded with
 * `imageOrientation: 'flipY'` for WebGL's benefit. The mask has to describe the
 * artwork the right way up or the traced cut line comes out mirrored against
 * the print, so the flip is undone while drawing.
 */
export function extractAlphaMask(
  source: ImageBitmap,
  { sourceIsFlipped }: { sourceIsFlipped: boolean },
): AlphaMask {
  const scale = Math.min(1, MASK_MAX_EDGE / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('2D canvas context unavailable for alpha extraction.')

  if (sourceIsFlipped) {
    context.translate(0, height)
    context.scale(1, -1)
  }
  context.drawImage(source, 0, 0, width, height)
  context.setTransform(1, 0, 0, 1, 0, 0)
  const { data: rgba } = context.getImageData(0, 0, width, height)

  const data = new Uint8Array(width * height)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const alpha = rgba[i * 4 + 3]
      data[i] = alpha
      if (alpha >= ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const aspect = width / height
  const bounds =
    minX <= maxX
      ? {
          minX: ((minX + 0.5) / width - 0.5) * aspect,
          maxX: ((maxX + 0.5) / width - 0.5) * aspect,
          minY: 0.5 - (maxY + 0.5) / height,
          maxY: 0.5 - (minY + 0.5) / height,
        }
      : null

  return { width, height, data, bounds }
}
