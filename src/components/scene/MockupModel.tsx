import { ContactShadows } from '@react-three/drei'
import type { SceneDimensions } from '../../lib/dimensions'
import type { MockupConfig } from '../../types/config'
import { AcrylicLayerMesh } from './AcrylicLayerMesh'
import { BaseMesh } from './BaseMesh'
import { HardwareMesh } from './HardwareMesh'
import { MagnetSheet } from './MagnetSheet'

export function MockupModel({
  config,
  dims,
}: {
  config: MockupConfig
  dims: SceneDimensions
}) {
  return (
    <group>
      <ContactShadows
        position={[0, 0.0008, 0]}
        scale={Math.max(dims.panelHeight, dims.base.width) * 2.4}
        far={dims.panelHeight * 0.5}
        blur={1.9}
        opacity={0.58}
        resolution={512}
      />

      <HardwareMesh hardware={config.hardware} dims={dims} lines={config.lines} />

      {config.hardware.type === 'magnet' && dims.layers.length > 0 && (
        // Backed onto the rearmost layer, which is the one it is bonded to.
        <MagnetSheet
          layout={dims.layers[0]}
          dims={dims}
          hardware={config.hardware}
          lines={config.lines}
        />
      )}

      {config.base.enabled && (
        <BaseMesh
          dims={dims}
          base={config.base}
          material={config.material}
          lines={config.lines}
        />
      )}

      {config.layers.map((layer, index) => (
        <AcrylicLayerMesh
          key={layer.id}
          layer={layer}
          layout={dims.layers[index]}
          dims={dims}
          material={config.material}
          lines={config.lines}
        />
      ))}
    </group>
  )
}
