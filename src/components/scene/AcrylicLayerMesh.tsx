import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { LayerLayout, SceneDimensions } from '../../lib/dimensions'
import { circleHole, extrudeSlab, polygonShapes, roundedRectShape } from '../../lib/geometry'
import { useConfigStore } from '../../store/configStore'
import type { AcrylicLayer, MockupConfig } from '../../types/config'
import { getAcrylicMaterialProps, getEdgeMaterialProps } from './acrylicMaterial'
import { useCheapMaterials } from './useCheapMaterials'

/** Keeps the print from z-fighting with the face it sits on. */
const PRINT_OFFSET = 0.00002

export function AcrylicLayerMesh({
  layer,
  layout,
  dims,
  material,
}: {
  layer: AcrylicLayer
  layout: LayerLayout
  dims: SceneDimensions
  material: MockupConfig['material']
}) {
  const texture = useConfigStore((s) =>
    layer.imageAssetId ? (s.assets[layer.imageAssetId]?.texture ?? null) : null,
  )

  const { x, y, scale, rotation } = layout.placement

  // The keyring hole is positioned on the panel, but it has to be cut into
  // geometry that lives in the layer's own transformed space — so undo the
  // layer's placement to find where the hole lands locally.
  const localHole = useMemo(() => {
    if (!dims.hole) return null
    const groupX = layout.offset[0] + x * dims.panelWidth
    const groupY = layout.offset[1] + y * dims.panelHeight
    const radians = (-rotation * Math.PI) / 180
    const dx = (dims.hole.x - groupX) / scale
    const dy = (dims.hole.y - groupY) / scale
    return {
      x: dx * Math.cos(radians) - dy * Math.sin(radians),
      y: dx * Math.sin(radians) + dy * Math.cos(radians),
      radius: dims.hole.radius / scale,
    }
  }, [dims.hole, dims.panelWidth, dims.panelHeight, layout.offset, x, y, scale, rotation])

  // Geometry is rebuilt only when a structural property changes — never per
  // frame and never on a pure material tweak (plan §7).
  const geometry = useMemo(() => {
    const shapes = layout.outline
      ? polygonShapes(layout.outline)
      : [roundedRectShape(dims.panelWidth, dims.panelHeight, dims.cornerRadius)]

    // A Shape hole beats a CSG boolean here: ExtrudeGeometry triangulates the
    // hole directly, so there is no mesh-BVH dependency and no boolean to
    // recompute every time the hole moves. Cut it into the largest piece —
    // findIslands returns them biggest-first — since that is the one a keyring
    // would actually go through.
    if (localHole && shapes.length > 0) {
      shapes[0].holes.push(circleHole(localHole.x, localHole.y, localHole.radius))
    }

    return extrudeSlab(shapes, layout.thickness)
  }, [
    layout.outline,
    layout.thickness,
    dims.panelWidth,
    dims.panelHeight,
    dims.cornerRadius,
    localHole,
  ])
  useEffect(() => () => geometry.dispose(), [geometry])

  const cheap = useCheapMaterials()
  const faceProps = getAcrylicMaterialProps(material, layout.thickness, cheap)
  const edgeProps = getEdgeMaterialProps(material, layout.thickness, cheap)

  // 'sandwiched' floats the art inside the slab so the front face of acrylic
  // sits over it; 'surfacePrint' lays it on the front face.
  const printZ =
    layer.imageMode === 'sandwiched' ? 0 : layout.thickness / 2 + PRINT_OFFSET

  return (
    <group position={[0, dims.panelCentreY, layout.zOffset]}>
      {/*
        Placement transforms the cut and the print together. On a traced panel
        they are the same outline, so moving one without the other would slide
        the artwork off its own cut edge.
      */}
      <group
        position={[
          layout.offset[0] + x * dims.panelWidth,
          layout.offset[1] + y * dims.panelHeight,
          0,
        ]}
        rotation={[0, 0, (rotation * Math.PI) / 180]}
        // Z stays at 1 so scaling the silhouette never changes the acrylic's
        // real thickness.
        scale={[scale, scale, 1]}
      >
        <mesh geometry={geometry}>
          <meshPhysicalMaterial attach="material-0" {...faceProps} />
          <meshPhysicalMaterial attach="material-1" {...edgeProps} />
        </mesh>

        {texture && layout.art && (
          <mesh position={[0, 0, printZ]}>
            <planeGeometry args={[layout.art.width, layout.art.height]} />
            {/*
              alphaTest (not `transparent`) on purpose: three's transmission
              pass only captures opaque-listed objects, so a `transparent`
              print would vanish when seen through the acrylic in front of it.
              alphaToCoverage gives the cut-out edge its antialiasing back.
            */}
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
    </group>
  )
}
