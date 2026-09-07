import { useEffect, useMemo } from 'react'
import type { SceneDimensions } from '../../lib/dimensions'
import { extrudeSlab, roundedRectShape } from '../../lib/geometry'
import type { MockupConfig } from '../../types/config'
import { getAcrylicMaterialProps, getEdgeMaterialProps } from './acrylicMaterial'
import { useCheapMaterials } from './useCheapMaterials'

/**
 * The slotted stand the panel sits in. Shares the panel's acrylic material so
 * a clear base actually reads as clear, tinted by `base.color`.
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
  const { width, height, depth } = dims.base

  const geometry = useMemo(() => {
    const radius = base.shape === 'rectangle' ? 0 : Math.min(depth * 0.22, height * 0.4)
    // Extruded along +Z then laid flat, so the "depth" of the extrusion
    // becomes the height of the stand.
    return extrudeSlab(roundedRectShape(width, depth, radius), height)
  }, [width, depth, height, base.shape])

  useEffect(() => () => geometry.dispose(), [geometry])

  const cheap = useCheapMaterials()
  const faceProps = {
    ...getAcrylicMaterialProps(material, height, cheap),
    attenuationColor: base.color,
    attenuationDistance: height * 1.4,
  }
  const edgeProps = {
    ...getEdgeMaterialProps(material, height, cheap),
    attenuationColor: base.color,
    attenuationDistance: height * 1.4,
  }

  return (
    <mesh
      geometry={geometry}
      position={[0, height / 2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}

    >
      <meshPhysicalMaterial attach="material-0" {...faceProps} />
      <meshPhysicalMaterial attach="material-1" {...edgeProps} />
    </mesh>
  )
}
