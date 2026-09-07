import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { LightingPreset } from '../../types/config'

/**
 * Lighting comes from a procedurally-built environment map rather than a
 * bundled .hdr: Lightformer rects are baked into a small cubemap once per
 * preset. That keeps the bundle tiny, avoids drei's CDN HDRI fetch (which
 * would be an external network dependency on GitHub Pages), and gives us
 * direct control over the studio "softbox" shapes that sell the acrylic look.
 */
type LightformerSpec = {
  intensity: number
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: [number, number, number]
  form?: 'rect' | 'circle'
  color?: string
}

const PRESETS: Record<LightingPreset, { background: string; lights: LightformerSpec[] }> = {
  // Broad wraparound softboxes: gentle falloff, gentle edge highlights.
  studioSoft: {
    background: '#dedede',
    lights: [
      { intensity: 3.2, position: [0, 3, 1.5], rotation: [-Math.PI / 2.4, 0, 0], scale: [6, 6, 1] },
      { intensity: 1.6, position: [-3, 1, 2], rotation: [0, -Math.PI / 3, 0], scale: [4, 5, 1] },
      { intensity: 1.4, position: [3, 1, 2], rotation: [0, Math.PI / 3, 0], scale: [4, 5, 1] },
      { intensity: 1.0, position: [0, 0.5, -4], scale: [7, 5, 1] },
    ],
  },
  // Small, bright, high-contrast key: crisp specular streaks on the edges.
  studioHard: {
    background: '#6e6e6e',
    lights: [
      { intensity: 9, position: [-1.6, 2.4, 2.2], rotation: [-0.7, -0.5, 0], scale: [1.4, 2.4, 1] },
      { intensity: 3, position: [2.4, 0.8, 1.4], rotation: [0, 1.1, 0], scale: [0.9, 2.2, 1] },
      { intensity: 2.2, position: [0, -1.5, -2.5], scale: [5, 3, 1] },
      { intensity: 2.2, form: 'circle', position: [0, 3.5, -1], rotation: [Math.PI / 2, 0, 0], scale: [1.6, 1.6, 1] },
    ],
  },
  // Overhead sky dome plus a warm low sun and a cool bounce.
  daylight: {
    background: '#e6ecf2',
    lights: [
      { intensity: 4.5, position: [0, 4, 0], rotation: [Math.PI / 2, 0, 0], scale: [9, 9, 1], color: '#eaf1f8' },
      { intensity: 6, form: 'circle', position: [2.8, 2.6, 2.2], rotation: [0, 0.9, 0], scale: [1, 1, 1], color: '#fff4e2' },
      { intensity: 1.4, position: [-3, 0.4, 1.5], rotation: [0, -1.1, 0], scale: [4, 3, 1], color: '#dbe6f2' },
    ],
  },
}

export function LightingRig({
  preset,
  intensity,
}: {
  preset: LightingPreset
  intensity: number
}) {
  const scene = useThree((s) => s.scene)
  const config = PRESETS[preset]

  // Scaling the environment on the scene rather than rebaking the cubemap
  // keeps the intensity slider free — no PMREM pass per drag frame.
  useEffect(() => {
    scene.environmentIntensity = intensity
    return () => {
      scene.environmentIntensity = 1
    }
  }, [scene, intensity])

  return (
    <Environment key={preset} resolution={256} frames={1}>
      <color attach="background" args={[config.background]} />
      {config.lights.map((light, index) => (
        <Lightformer
          key={index}
          form={light.form ?? 'rect'}
          intensity={light.intensity}
          color={light.color ?? '#ffffff'}
          position={light.position}
          rotation={light.rotation}
          scale={light.scale}
        />
      ))}
    </Environment>
  )
}
