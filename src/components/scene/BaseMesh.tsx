import { useEffect, useMemo } from 'react'
import type { SceneDimensions } from '../../lib/dimensions'
import { circleShape, extrudeSlab, rectHole, roundedRectShape } from '../../lib/geometry'
import type { MockupConfig } from '../../types/config'
import { getAcrylicMaterialProps, getEdgeMaterialProps } from './acrylicMaterial'
import { useCheapMaterials } from './useCheapMaterials'

/**
 * The base plate: a flat piece of acrylic the standee slots into, cut from the
 * same sheet stock as the panel rather than being a chunky block.
 *
 * It is extruded along +Z and then laid flat, so the extrusion depth becomes
 * the plate's thickness. In that local space x is world x and y is world -z,
 * which is why the slot's own depth runs along the shape's y axis.
 */
export function BaseMesh({
  dims,
  base,
  material,
}: {
  dims: SceneDimensions
  base: MockupConfig['base']
  material: MockupConfig['material']
}) {
  const { width, depth, thickness, slot } = dims.base

  const geometry = useMemo(() => {
    const shape =
      base.shape === 'circle'
        ? circleShape(width / 2)
        : roundedRectShape(
            width,
            depth,
            base.shape === 'rectangle' ? 0 : Math.min(depth * 0.18, width * 0.08),
          )

    if (slot && slot.width > 0 && slot.depth > 0) {
      shape.holes.push(rectHole(slot.x, 0, slot.width, slot.depth))
    }

    return extrudeSlab(shape, thickness)
  }, [base.shape, width, depth, thickness, slot])

  useEffect(() => () => geometry.dispose(), [geometry])

  const cheap = useCheapMaterials()
  const tint = { attenuationColor: base.color, attenuationDistance: thickness * 1.4 }
  const faceProps = { ...getAcrylicMaterialProps(material, thickness, cheap), ...tint }
  const edgeProps = { ...getEdgeMaterialProps(material, thickness, cheap), ...tint }

  return (
    <mesh
      geometry={geometry}
      position={[0, thickness / 2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshPhysicalMaterial attach="material-0" {...faceProps} />
      <meshPhysicalMaterial attach="material-1" {...edgeProps} />
    </mesh>
  )
}
