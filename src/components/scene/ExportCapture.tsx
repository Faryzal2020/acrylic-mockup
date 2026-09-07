import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { downloadCanvasPng, timestampedFilename } from '../../lib/exportImage'
import { composeTransparentFrame } from '../../lib/transparentComposite'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'

/** Lets React commit the "Rendering…" label before we block on the draw. */
const flushReact = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Captures a still. The canvas is temporarily resized to the requested
 * multiplier and drawn at full transmission quality, so the exported PNG
 * matches (and exceeds) what the live preview shows.
 *
 * The resize and the draw happen synchronously in one task, so nothing —
 * QualityManager's effect included — can reset the pixel ratio in between.
 * Deliberately not driven by requestAnimationFrame: a backgrounded tab
 * throttles rAF, which would leave the export hanging indefinitely.
 *
 * Requires `preserveDrawingBuffer` on the renderer — see SceneCanvas.
 */
export function ExportCapture() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  const exportRequest = useRuntimeStore((s) => s.exportRequest)
  const transparent = useConfigStore((s) => s.config.background.mode === 'transparent')

  const transparentRef = useRef(transparent)
  useEffect(() => {
    transparentRef.current = transparent
  }, [transparent])
  const sizeRef = useRef(size)
  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    if (exportRequest === 0) return

    const run = async () => {
      const store = useRuntimeStore.getState()
      const { exportScale } = store
      store.setExporting(true)
      store.setQuality('full')
      await flushReact()

      const previousPixelRatio = gl.getPixelRatio()
      const { width, height } = sizeRef.current

      try {
        if ('transmissionResolutionScale' in gl) gl.transmissionResolutionScale = 1
        gl.setPixelRatio(exportScale)
        gl.setSize(width, height, false)

        let surface = gl.domElement as HTMLCanvasElement

        if (transparentRef.current) {
          // Transparent exports go through the studio composite so the acrylic
          // keeps its shading instead of flattening to the transmission pass's
          // clear colour. `exact` here, unlike the live preview.
          const composite = document.createElement('canvas')
          composeTransparentFrame({ gl, scene, camera, target: composite, exact: true })
          surface = composite
        } else {
          gl.render(scene, camera)
        }

        await downloadCanvasPng(surface, timestampedFilename('acrylic-mockup', 'png'))
      } catch (error) {
        console.error('Still export failed', error)
      } finally {
        gl.setPixelRatio(previousPixelRatio)
        gl.setSize(width, height, false)
        useRuntimeStore.getState().setExporting(false)
      }
    }

    void run()
  }, [exportRequest, gl, scene, camera])

  return null
}
