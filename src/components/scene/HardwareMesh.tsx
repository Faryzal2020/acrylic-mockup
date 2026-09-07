import type { SceneDimensions } from '../../lib/dimensions'
import { mm } from '../../lib/units'
import type { MockupConfig } from '../../types/config'
import { InkLines } from './InkLines'

/**
 * Keyring and pop-socket hardware. Both are brushed metal / moulded plastic
 * rather than acrylic, so they use plain standard materials — keeping them out
 * of the transmission pass, which is the expensive one.
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

  // Pop socket: mounts flat on the back of the stack.
  const outerRadius = Math.min(dims.panelWidth, dims.panelHeight) * 0.26
  const backZ = -dims.stackDepth / 2

  return (
    <group
      position={[x, dims.panelCentreY + y, backZ]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh position={[0, -mm(1.5), 0]}>
        <cylinderGeometry args={[outerRadius, outerRadius, mm(3), 48]} />
        <meshStandardMaterial color="#2f2f2f" roughness={0.55} metalness={0} />
        <InkLines lines={lines} />
      </mesh>
      <mesh position={[0, -mm(6), 0]}>
        <cylinderGeometry args={[outerRadius * 0.82, outerRadius * 0.9, mm(6), 48]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, -mm(10), 0]}>
        <cylinderGeometry args={[outerRadius * 0.98, outerRadius * 0.82, mm(2.5), 48]} />
        <meshStandardMaterial color="#2f2f2f" roughness={0.4} metalness={0} />
        <InkLines lines={lines} />
      </mesh>
    </group>
  )
}
