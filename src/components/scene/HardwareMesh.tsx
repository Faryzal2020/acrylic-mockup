import type { SceneDimensions } from '../../lib/dimensions'
import { mm } from '../../lib/units'
import type { MockupConfig } from '../../types/config'
import { InkLines } from './InkLines'

/**
 * Keyring hardware: brushed metal rather than acrylic, so it takes a plain
 * standard material and stays out of the transmission pass, which is the
 * expensive one.
 */
export function HardwareMesh({
  hardware,
  dims,
  lines,
}: {
  hardware: MockupConfig['hardware']
  dims: SceneDimensions
  lines: MockupConfig['lines']
}) {
  if (hardware.type === 'none') return null

  const { x, y } = dims.hardwareAnchor

  if (hardware.type === 'keyring') {
    const holeRadius = mm(hardware.holeDiameter) / 2
    // A split ring sits proud of the hole rather than centred in it.
    const ringRadius = holeRadius * 2.1
    const wire = holeRadius * 0.34

    return (
      <group position={[0, dims.panelCentreY + y, 0]}>
        <mesh position={[x, ringRadius * 0.72, 0]}>
          <torusGeometry args={[ringRadius, wire, 12, 40]} />
          <meshStandardMaterial color="#c9ccd1" metalness={1} roughness={0.28} />
          <InkLines lines={lines} />
        </mesh>
        {/* The small linking loop that actually passes through the panel. */}
        <mesh position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[holeRadius * 0.62, wire * 0.8, 10, 28]} />
          <meshStandardMaterial color="#c9ccd1" metalness={1} roughness={0.28} />
          <InkLines lines={lines} />
        </mesh>
      </group>
    )
  }

  // The magnet sheet is cut from the panel's own outline, so it lives in
  // MagnetSheet where that geometry is available.
  return null
}
