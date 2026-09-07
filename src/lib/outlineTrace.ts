import { ALPHA_THRESHOLD, type AlphaMask } from './alphaMask'

export type TracedOutline = {
  /**
   * One closed polygon per cut piece, in image space: the source image spans
   * `aspect` wide by 1 tall, centred on the origin, y-up. Points can fall
   * outside that box — the border lip is added before tracing, so the
   * silhouette is larger than the artwork.
   *
   * Several contours are normal: a detail layer holding a pair of eyes and a
   * mouth is three separate pieces of acrylic, not one.
   */
  contours: { x: number; y: number }[][]
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
}

export type TraceOptions = {
  /** 0-255. Pixels at or above this alpha are part of the artwork. */
  alphaThreshold: number
  /** Border lip, as a fraction of the artwork's height. */
  borderFraction: number
}

/**
 * Tracing costs a few milliseconds, and the scene recomputes its dimensions on
 * every config change — including material tweaks that cannot affect the cut
 * line. Cache per mask so only an actual border change pays for a re-trace.
 */
const traceCache = new WeakMap<AlphaMask, Map<string, TracedOutline | null>>()

export function traceOutlineCached(
  mask: AlphaMask,
  borderFraction: number,
): TracedOutline | null {
  let perMask = traceCache.get(mask)
  if (!perMask) {
    perMask = new Map()
    traceCache.set(mask, perMask)
  }

  // Quantise so sub-pixel jitter in the border does not defeat the cache.
  const quantised = Math.round(borderFraction * 2000) / 2000
  const key = String(quantised)

  if (!perMask.has(key)) {
    perMask.set(
      key,
      traceOutline(mask, {
        alphaThreshold: ALPHA_THRESHOLD,
        borderFraction: quantised,
      }),
    )
  }

  return perMask.get(key) ?? null
}

/**
 * Alpha channel -> cut line, entirely client-side.
 *
 * Real acrylic standees are cut a few millimetres outside the artwork, leaving
 * a visible clear lip, so the mask is dilated by that border before the
 * contour is walked. Interior holes are filled — you would not cut a window
 * out of the middle of a standee — but every island above a minimum size is
 * kept and traced separately, so a layer made of disconnected pieces comes out
 * as disconnected pieces.
 */
export function traceOutline(mask: AlphaMask, options: TraceOptions): TracedOutline | null {
  const borderPx = Math.max(0, options.borderFraction * mask.height)
  const pad = Math.ceil(borderPx) + 2
  const width = mask.width + pad * 2
  const height = mask.height + pad * 2

  const binary = new Uint8Array(width * height)
  let any = false
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] >= options.alphaThreshold) {
        binary[(y + pad) * width + (x + pad)] = 1
        any = true
      }
    }
  }
  if (!any) return null

  const grown = borderPx > 0 ? dilate(binary, width, height, borderPx) : binary
  const solid = fillHoles(grown, width, height)
  const islands = findIslands(solid, width, height)
  if (!islands.length) return null

  const aspect = mask.width / mask.height
  const contours = islands
    .map((island) => traceBoundary(island.mask, width, height, island.start))
    .filter((traced) => traced.length >= 3)
    .map((traced) =>
      smooth(simplify(traced, 0.8), 2).map(([px, py]) => ({
        // Marching over pixel centres, so shift by half a pixel.
        x: ((px + 0.5 - pad) / mask.width - 0.5) * aspect,
        y: 0.5 - (py + 0.5 - pad) / mask.height,
      })),
    )

  if (!contours.length) return null

  const bounds = contours.flat().reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  )

  return { contours, bounds }
}

/* ------------------------------------------------------------- internals -- */

/**
 * Grows the mask by `radius` pixels using a 3-4 chamfer distance transform.
 * Chamfer is a couple of percent off true Euclidean distance, which is well
 * below what anyone can see in a 3mm cut border, and it runs in two passes.
 */
function dilate(binary: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const ORTH = 3
  const DIAG = 4
  const INF = 1e9
  const dist = new Float32Array(width * height)

  for (let i = 0; i < dist.length; i++) dist[i] = binary[i] ? 0 : INF

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      let d = dist[i]
      if (y > 0) {
        d = Math.min(d, dist[i - width] + ORTH)
        if (x > 0) d = Math.min(d, dist[i - width - 1] + DIAG)
        if (x < width - 1) d = Math.min(d, dist[i - width + 1] + DIAG)
      }
      if (x > 0) d = Math.min(d, dist[i - 1] + ORTH)
      dist[i] = d
    }
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      let d = dist[i]
      if (y < height - 1) {
        d = Math.min(d, dist[i + width] + ORTH)
        if (x < width - 1) d = Math.min(d, dist[i + width + 1] + DIAG)
        if (x > 0) d = Math.min(d, dist[i + width - 1] + DIAG)
      }
      if (x < width - 1) d = Math.min(d, dist[i + 1] + ORTH)
      dist[i] = d
    }
  }

  const limit = radius * ORTH
  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = dist[i] <= limit ? 1 : 0
  return out
}

/** Flood fills background inwards from the frame; whatever it cannot reach was a hole. */
function fillHoles(binary: Uint8Array, width: number, height: number): Uint8Array {
  const outside = new Uint8Array(width * height)
  const stack: number[] = []

  const push = (i: number) => {
    if (!binary[i] && !outside[i]) {
      outside[i] = 1
      stack.push(i)
    }
  }

  for (let x = 0; x < width; x++) {
    push(x)
    push((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    push(y * width)
    push(y * width + width - 1)
  }

  while (stack.length) {
    const i = stack.pop() as number
    const x = i % width
    const y = (i / width) | 0
    if (x > 0) push(i - 1)
    if (x < width - 1) push(i + 1)
    if (y > 0) push(i - width)
    if (y < height - 1) push(i + width)
  }

  const out = new Uint8Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = outside[i] ? 0 : 1
  return out
}

/** Minimum island area, relative to the biggest one, before it counts as a piece. */
const MIN_ISLAND_RATIO = 0.01

/**
 * Every connected blob worth cutting, biggest first. Specks below
 * MIN_ISLAND_RATIO are dropped — a stray antialiased pixel is not a piece of
 * acrylic.
 */
function findIslands(
  binary: Uint8Array,
  width: number,
  height: number,
): { mask: Uint8Array; start: [number, number] }[] {
  const seen = new Uint8Array(width * height)
  const found: { pixels: number[]; first: number }[] = []

  for (let seed = 0; seed < binary.length; seed++) {
    if (!binary[seed] || seen[seed]) continue

    const pixels: number[] = []
    const stack = [seed]
    seen[seed] = 1

    while (stack.length) {
      const i = stack.pop() as number
      pixels.push(i)
      const x = i % width
      const y = (i / width) | 0
      const visit = (j: number) => {
        if (binary[j] && !seen[j]) {
          seen[j] = 1
          stack.push(j)
        }
      }
      if (x > 0) visit(i - 1)
      if (x < width - 1) visit(i + 1)
      if (y > 0) visit(i - width)
      if (y < height - 1) visit(i + width)
    }

    found.push({ pixels, first: Math.min(...pixels) })
  }

  if (!found.length) return []

  const largest = Math.max(...found.map((f) => f.pixels.length))

  return found
    .filter((f) => f.pixels.length >= largest * MIN_ISLAND_RATIO)
    .sort((a, b) => b.pixels.length - a.pixels.length)
    .map((f) => {
      const mask = new Uint8Array(width * height)
      for (const i of f.pixels) mask[i] = 1
      return { mask, start: [f.first % width, (f.first / width) | 0] as [number, number] }
    })
}

// Clockwise from north-west.
const NEIGHBOURS: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
]

/** Moore-neighbour boundary walk around a filled, hole-free island. */
function traceBoundary(
  mask: Uint8Array,
  width: number,
  height: number,
  start: [number, number],
): [number, number][] {
  const isSet = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1

  const contour: [number, number][] = []
  let current = start
  // We scanned top-to-bottom, so the pixel to the left of the start is background.
  let backtrack: [number, number] = [start[0] - 1, start[1]]
  const limit = width * height * 4

  for (let step = 0; step < limit; step++) {
    contour.push(current)

    const from = NEIGHBOURS.findIndex(
      ([dx, dy]) => current[0] + dx === backtrack[0] && current[1] + dy === backtrack[1],
    )
    if (from < 0) break

    let moved = false
    for (let k = 1; k <= 8; k++) {
      const [dx, dy] = NEIGHBOURS[(from + k) % 8]
      const nx = current[0] + dx
      const ny = current[1] + dy
      if (isSet(nx, ny)) {
        const [bx, by] = NEIGHBOURS[(from + k - 1) % 8]
        backtrack = [current[0] + bx, current[1] + by]
        current = [nx, ny]
        moved = true
        break
      }
    }

    if (!moved) break
    if (current[0] === start[0] && current[1] === start[1]) break
  }

  return contour
}

/** Douglas-Peucker. Takes a few thousand staircase pixels down to a few hundred points. */
function simplify(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length < 3) return points

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1

  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop() as [number, number]
    let maxDistance = 0
    let index = -1

    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i], points[first], points[last])
      if (d > maxDistance) {
        maxDistance = d
        index = i
      }
    }

    if (index >= 0 && maxDistance > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return points.filter((_, i) => keep[i])
}

function perpendicularDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  const cx = a[0] + t * dx
  const cy = a[1] + t * dy
  return Math.hypot(p[0] - cx, p[1] - cy)
}

/** Chaikin corner cutting — takes the last of the pixel staircase off the cut line. */
function smooth(points: [number, number][], passes: number): [number, number][] {
  let current = points
  for (let pass = 0; pass < passes; pass++) {
    if (current.length < 3) break
    const next: [number, number][] = []
    for (let i = 0; i < current.length; i++) {
      const a = current[i]
      const b = current[(i + 1) % current.length]
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25])
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    current = next
  }
  return current
}
