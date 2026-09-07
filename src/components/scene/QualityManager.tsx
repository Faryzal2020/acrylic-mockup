import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useRuntimeStore } from '../../store/runtimeStore'

/** Full-quality device pixel ratio ceiling — 2 is plenty for a still export. */
export const MAX_DPR = 2
/** Transmission sampler scale while the user is interacting. */
const PREVIEW_TRANSMISSION_SCALE = 0.5

/**
 * Implements the two-tier render strategy from plan §7.
 *
 * While the user orbits or drags a slider we run at DPR 1 with a half-res
 * transmission sampler; ~300ms after they stop we go back to full DPR and a
 * full-res sampler. Both knobs are imperative on the renderer, so switching
 * modes costs no React re-render of the scene graph.
 */
export function QualityManager() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const quality = useRuntimeStore((s) => s.quality)
  const exporting = useRuntimeStore((s) => s.exporting)

  useEffect(() => {
    if (exporting) return
    const dpr = quality === 'full' ? Math.min(window.devicePixelRatio, MAX_DPR) : 1
    gl.setPixelRatio(dpr)
    gl.setSize(size.width, size.height, false)
    if ('transmissionResolutionScale' in gl) {
      gl.transmissionResolutionScale = quality === 'full' ? 1 : PREVIEW_TRANSMISSION_SCALE
    }
  }, [gl, quality, exporting, size.width, size.height])

  return null
}

/** Samples frame rate for the header readout without re-rendering per frame. */
export function FpsMeter() {
  const setFps = useRuntimeStore((s) => s.setFps)
  const frames = useRef(0)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    frames.current += 1
    elapsed.current += delta
    if (elapsed.current >= 0.5) {
      setFps(Math.round(frames.current / elapsed.current))
      frames.current = 0
      elapsed.current = 0
    }
  })

  return null
}
