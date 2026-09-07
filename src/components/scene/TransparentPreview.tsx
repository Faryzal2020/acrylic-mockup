import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import {
  composeTransparentFrame,
  getOverlayCanvas,
} from '../../lib/transparentComposite'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'

/**
 * Keeps the transparent preview honest.
 *
 * Compositing every frame is far too expensive, but it only has to be right
 * when the user stops to look — which is exactly the "settled" tier the
 * quality strategy already gives us. On settle we build the composite into an
 * overlay canvas and fade the WebGL canvas to `opacity: 0` behind it.
 *
 * Opacity rather than `visibility: hidden` on purpose: a hidden element stops
 * receiving pointer events, which would kill orbiting. At opacity 0 the canvas
 * still takes the pointer, and the first pointer-down drops quality back to
 * preview, which tears the overlay down again.
 */
export function TransparentPreview() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const config = useConfigStore((s) => s.config)
  const assets = useConfigStore((s) => s.assets)
  const quality = useRuntimeStore((s) => s.quality)
  const exporting = useRuntimeStore((s) => s.exporting)
  const recording = useRuntimeStore((s) => s.recording)

  const active = config.background.mode === 'transparent'

  useEffect(() => {
    const overlay = getOverlayCanvas()
    const canvas = gl.domElement as HTMLCanvasElement

    const reset = () => {
      if (overlay) overlay.style.display = 'none'
      canvas.style.opacity = ''
    }

    if (!overlay || !active || quality !== 'full' || exporting || recording) {
      reset()
      return
    }

    // One tick of slack so React has committed whatever changed before we
    // render it; rapid edits coalesce because the cleanup cancels this.
    const timer = setTimeout(() => {
      try {
        composeTransparentFrame({ gl, scene, camera, target: overlay, exact: false })
        overlay.style.display = 'block'
        canvas.style.opacity = '0'
      } catch (error) {
        console.error('Transparent preview composite failed', error)
        reset()
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      reset()
    }
  }, [gl, scene, camera, active, quality, exporting, recording, config, assets])

  return null
}
