import { useEffect, useMemo } from 'react'
import type { LayerLayout, SceneDimensions } from '../../lib/dimensions'
import { extrudeSlab, polygonShapes, roundedRectShape } from '../../lib/geometry'
import { mm } from '../../lib/units'
import type { MockupConfig } from '../../types/config'
import { InkLines } from './InkLines'

/**
 * The magnet sheet bonded to the back of the stack.
 *
 * It is cut to the same outline as the layer it backs — the backmost acrylic
 * piece — and inherits that layer's placement, so it stays registered with the
 * cut no matter how the layer is nudged. Opaque and dark: unlike everything
 * else here it is not acrylic, so it takes a plain standard material and stays
 * out of the transmission pass's expensive path while still showing through the
 * clear acrylic in front of it.
 */
export function MagnetSheet({
  layout,
  dims,
  hardware,
  lines,
}: {
  layout: LayerLayout
  dims: SceneDimensions
  hardware: MockupConfig['hardware']
  lines: MockupConfig['lines']
}) {
  const thickness = mm(hardware.magnetThickness)

  const geometry = useMemo(
    () =>
      extrudeSlab(
        layout.outline
          ? polygonShapes(layout.outline)
          : roundedRectShape(dims.panelWidth, dims.panelHeight, dims.cornerRadius),
        thickness,
      ),
    [layout.outline, dims.panelWidth, dims.panelHeight, dims.cornerRadius, thickness],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const { x, y, scale, rotation } = layout.placement

  return (
    <group
      position={[0, dims.panelCentreY, -dims.stackDepth / 2 - thickness / 2]}
    >
      <group
        position={[
          layout.offset[0] + x * dims.panelWidth,
          layout.offset[1] + y * dims.panelHeight,
          0,
        ]}
        rotation={[0, 0, (rotation * Math.PI) / 180]}
        scale={[scale, scale, 1]}
      >
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={hardware.magnetColor}
            roughness={0.82}
            metalness={0}
          />
          <InkLines lines={lines} geometry={geometry} />
        </mesh>
      </group>
    </group>
  )
}
