import * as THREE from 'three'

/**
 * A rounded rectangle centred on the origin, for ExtrudeGeometry.
 * `radius` is clamped so it can never exceed half the shorter side.
 */
export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const w = width / 2
  const h = height / 2
  const shape = new THREE.Shape()

  shape.moveTo(-w + r, -h)
  shape.lineTo(w - r, -h)
  if (r > 0) shape.quadraticCurveTo(w, -h, w, -h + r)
  shape.lineTo(w, h - r)
  if (r > 0) shape.quadraticCurveTo(w, h, w - r, h)
  shape.lineTo(-w + r, h)
  if (r > 0) shape.quadraticCurveTo(-w, h, -w, h - r)
  shape.lineTo(-w, -h + r)
  if (r > 0) shape.quadraticCurveTo(-w, -h, -w, -h + r)
  shape.closePath()

  return shape
}

/**
 * Closed polygons (already in metres, panel-local) to extrudable shapes.
 * ExtrudeGeometry accepts an array, so several disconnected cut pieces still
 * make one mesh — and still with two material groups, faces and side walls.
 */
export function polygonShapes(contours: { x: number; y: number }[][]): THREE.Shape[] {
  return contours.map((points) => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y)
    }
    shape.closePath()
    return shape
  })
}

/** A disc, for the base plate. */
export function circleShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
  return shape
}

/** A rectangular hole path — the slot the standee's tab drops into. */
export function rectHole(
  centreX: number,
  centreY: number,
  width: number,
  height: number,
): THREE.Path {
  const path = new THREE.Path()
  const w = width / 2
  const h = height / 2
  path.moveTo(centreX - w, centreY - h)
  path.lineTo(centreX - w, centreY + h)
  path.lineTo(centreX + w, centreY + h)
  path.lineTo(centreX + w, centreY - h)
  path.closePath()
  return path
}

/** A circular hole path, for a keyring's through-hole. */
export function circleHole(cx: number, cy: number, radius: number): THREE.Path {
  const path = new THREE.Path()
  path.absarc(cx, cy, radius, 0, Math.PI * 2, true)
  return path
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
