import * as THREE from 'three'

export type Point2 = { x: number; y: number }

/**
 * Builds a shape from an explicit ring of points, with no `closePath()`.
 *
 * That omission is load bearing. ExtrudeGeometry computes its bevel offsets at
 * `ExtrudeGeometry.js:370` via `getBevelVec`, but the duplicate end point is
 * only dropped later, inside `triangulateShape` at line 402. So a contour
 * whose last point repeats its first — which is exactly what `closePath()` and
 * any curve ending on its start point produce — hands `getBevelVec` a
 * zero-length edge at the seam and gets a garbage offset back. The visible
 * result is a corner sheared into a diagonal, worse the further the seam sits
 * from the corner.
 *
 * Leaving the ring open avoids it: earcut and the side-wall loop both treat
 * the list as closed anyway.
 */
export function shapeFromPoints(points: Point2[]): THREE.Shape {
  const ring = dedupeRing(points)
  const shape = new THREE.Shape()
  shape.moveTo(ring[0].x, ring[0].y)
  for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i].x, ring[i].y)
  return shape
}

/** Same, for a hole. Holes go through `getBevelVec` too, so they need it as much. */
export function pathFromPoints(points: Point2[]): THREE.Path {
  const ring = dedupeRing(points)
  const path = new THREE.Path()
  path.moveTo(ring[0].x, ring[0].y)
  for (let i = 1; i < ring.length; i++) path.lineTo(ring[i].x, ring[i].y)
  return path
}

/** Drops consecutive duplicates and any repeat of the first point at the end. */
function dedupeRing(points: Point2[]): Point2[] {
  const out: Point2[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (!last || !samePoint(last, p)) out.push(p)
  }
  while (out.length > 2 && samePoint(out[out.length - 1], out[0])) out.pop()
  return out
}

const EPSILON = 1e-9
const samePoint = (a: Point2, b: Point2) =>
  Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON

/** Rounded rectangle centred on the origin, as true circular corner arcs. */
export function roundedRectPoints(
  width: number,
  height: number,
  radius: number,
  segments = 8,
): Point2[] {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const w = width / 2
  const h = height / 2

  if (r <= 0) {
    return [
      { x: -w, y: -h },
      { x: w, y: -h },
      { x: w, y: h },
      { x: -w, y: h },
    ]
  }

  const points: Point2[] = []
  const arc = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= segments; i++) {
      const angle = from + (i / segments) * (Math.PI / 2)
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    }
  }

  arc(w - r, -h + r, -Math.PI / 2)
  arc(w - r, h - r, 0)
  arc(-w + r, h - r, Math.PI / 2)
  arc(-w + r, -h + r, Math.PI)

  return points
}

export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  return shapeFromPoints(roundedRectPoints(width, height, radius))
}

/** A disc, for the base plate. */
export function circleShape(radius: number, segments = 64): THREE.Shape {
  return shapeFromPoints(circlePoints(0, 0, radius, segments))
}

function circlePoints(cx: number, cy: number, radius: number, segments: number): Point2[] {
  const points: Point2[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
  }
  return points
}

/** A rectangular hole path — the slot the standee's tab drops into. */
export function rectHole(
  centreX: number,
  centreY: number,
  width: number,
  height: number,
): THREE.Path {
  const w = width / 2
  const h = height / 2
  return pathFromPoints([
    { x: centreX - w, y: centreY - h },
    { x: centreX - w, y: centreY + h },
    { x: centreX + w, y: centreY + h },
    { x: centreX + w, y: centreY - h },
  ])
}

/** A circular hole path, for a keyring's through-hole. */
export function circleHole(
  centreX: number,
  centreY: number,
  radius: number,
  segments = 32,
): THREE.Path {
  // Wound opposite to the outer ring; ExtrudeGeometry normalises hole winding
  // itself, but keeping it explicit costs nothing.
  return pathFromPoints(circlePoints(centreX, centreY, radius, segments).reverse())
}

/**
 * Closed polygons (already in metres, panel-local) to extrudable shapes.
 * ExtrudeGeometry accepts an array, so several disconnected cut pieces still
 * make one mesh — and still with two material groups, faces and side walls.
 */
export function polygonShapes(contours: Point2[][]): THREE.Shape[] {
  return contours.map(shapeFromPoints)
}

/**
 * Extrudes a shape along +Z and re-centres it so the slab straddles z = 0.
 * A small bevel is what makes the cut edge catch light and read as acrylic
 * rather than as a flat transparent quad.
 */
export function extrudeSlab(
  shape: THREE.Shape | THREE.Shape[],
  depth: number,
): THREE.ExtrudeGeometry {
  const bevel = Math.min(depth * 0.12, 0.0004)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  return geometry
}
