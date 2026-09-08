import { Edges, Outlines } from '@react-three/drei'
import type * as THREE from 'three'
import type { MockupConfig } from '../../types/config'

/**
 * Angle between adjacent faces before an edge counts as a crease. Low enough
 * to catch the cut contour and the bevel, high enough that a smoothed traced
 * outline does not sprout a line at every segment join.
 */
const CREASE_THRESHOLD = 18

/**
 * Ink lines over the render: geometric edges, and a heavier silhouette.
 *
 * Drop this inside a `<mesh>` — both drei components read the parent's
 * geometry.
 *
 * Widths are in screen pixels for both. For `Outlines` that means
 * `screenspace={false}`, which reads backwards but is correct: that is the
 * branch dividing the offset by the viewport size. The `screenspace` branch
 * offsets in model space instead, so the outline would swell as you zoom in.
 *
 * `angle` makes drei run the geometry through `toCreasedNormals` first.
 * Without it the inverted-hull outline tears open at every corner of an
 * extruded slab, whose face normals are hard.
 *
 * The outline is marked `transparent` even at full opacity, and that is load
 * bearing. `Outlines` is an inverted hull sitting just behind the mesh; as an
 * opaque object three renders it into the transmission target, so every
 * transmissive surface in front of it refracts its own black shell — a clear
 * base turns nearly black. Transparent-listed objects are excluded from that
 * pass, and the hull still draws where it should because the acrylic has
 * already written depth in front of it.
 */
export function InkLines({
  lines,
  geometry,
}: {
  lines: MockupConfig['lines']
  /**
   * Passed explicitly rather than left to drei to read off the parent mesh.
   * `Edges` resolves `parent.geometry` inside a layout effect and caches on its
   * identity; handing it the same geometry object the mesh was given removes
   * any dependence on when that prop lands, which is what made edges silently
   * vanish until the toggle was cycled.
   */
  geometry?: THREE.BufferGeometry
}) {
  return (
    <>
      {lines.edges.enabled && lines.edges.width > 0 && (
        <Edges
          geometry={geometry}
          threshold={CREASE_THRESHOLD}
          lineWidth={lines.edges.width}
          color={lines.edges.color}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-4}
          // Line bounds are derived from a geometry that changes shape under
          // them; never let a stale bounding sphere cull the lines away.
          frustumCulled={false}
        />
      )}

      {lines.outline.enabled && lines.outline.width > 0 && (
        <Outlines
          thickness={lines.outline.width}
          color={lines.outline.color}
          angle={Math.PI}
          screenspace={false}
          toneMapped={false}
          transparent
          opacity={1}
        />
      )}
    </>
  )
}
