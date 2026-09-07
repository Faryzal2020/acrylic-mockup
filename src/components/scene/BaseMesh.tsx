import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { SceneDimensions } from '../../lib/dimensions'
import {
  circleShape,
  extrudeSlab,
  polygonShapes,
  rectHole,
  roundedRectShape,
} from '../../lib/geometry'
import { useConfigStore } from '../../store/configStore'
import type { MockupConfig } from '../../types/config'
import { getAcrylicMaterialProps, getEdgeMaterialProps } from './acrylicMaterial'
import { InkLines } from './InkLines'
import { useCheapMaterials } from './useCheapMaterials'

/** Keeps the printed top face off the plate's surface. */
const PRINT_OFFSET = 0.00002

/**
 * The base plate: a flat piece of acrylic the standee slots into, cut from the
 * same sheet stock as the panel rather than being a chunky block.
 *
 * It is extruded along +Z and then laid flat, so the extrusion depth becomes
 * the plate's thickness. In that local space x is world x and y is world -z,
 * which is why the slot's own depth runs along the shape's y axis, and why an
 * uploaded base artwork reads as a plan view.
 */
export function BaseMesh({
  dims,
  base,
  material,
  lines,
}: {
  dims: SceneDimensions
  base: MockupConfig['base']
  material: MockupConfig['material']
  lines: MockupConfig['lines']
}) {
  const { width, depth, thickness, slot, outline, art } = dims.base

  const texture = useConfigStore((s) =>
    base.imageAssetId ? (s.assets[base.imageAssetId]?.texture ?? null) : null,
  )

  const geometry = useMemo(() => {
    const shapes = outline
      ? polygonShapes(outline)
      : [
          base.shape === 'circle'
            ? circleShape(width / 2)
            : roundedRectShape(
                width,
                depth,
                base.shape === 'rectangle' ? 0 : Math.min(depth * 0.18, width * 0.08),
              ),
        ]

    if (slot && slot.width > 0 && slot.depth > 0 && shapes.length > 0) {
      shapes[0].holes.push(rectHole(slot.x, 0, slot.width, slot.depth))
    }

    return extrudeSlab(shapes, thickness)
  }, [outline, base.shape, width, depth, thickness, slot])

  useEffect(() => () => geometry.dispose(), [geometry])

  const cheap = useCheapMaterials()
  // Tint is opt-in; without it the plate reads as plain clear acrylic.
  const tint = base.tintEnabled
    ? { attenuationColor: base.color, attenuationDistance: thickness * 1.4 }
    : {}
  const faceProps = { ...getAcrylicMaterialProps(material, thickness, cheap), ...tint }
  const edgeProps = { ...getEdgeMaterialProps(material, thickness, cheap), ...tint }

  return (
    <group>
      <mesh
        geometry={geometry}
        position={[0, thickness / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial attach="material-0" {...faceProps} />
        <meshPhysicalMaterial attach="material-1" {...edgeProps} />
        <InkLines lines={lines} />
      </mesh>

      {texture && art && base.imageOnBase && (
        // Laid flat on the top face. Local +Y maps to world -Z under this
        // rotation, matching how the cut outline was traced.
        <mesh
          position={[art.x, thickness + PRINT_OFFSET, -art.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[art.width, art.height]} />
          <meshStandardMaterial
            map={texture}
            alphaTest={0.5}
            alphaToCoverage
            transparent={false}
            side={THREE.DoubleSide}
            roughness={0.42}
            metalness={0}
          />
        </mesh>
      )}
    </group>
  )
}
