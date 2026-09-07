import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getSharedBackdropTexture } from '../../lib/backdrop'
import { triggerDownload, timestampedFilename } from '../../lib/exportImage'
import { useRuntimeStore } from '../../store/runtimeStore'

const FPS = 30

/**
 * Turntable video, encoded by the browser.
 *
 * The plan floated ffmpeg.wasm; MediaRecorder over `canvas.captureStream()`
 * does the same job with no dependency, no ~30MB wasm payload to ship on
 * GitHub Pages, and hardware-accelerated encoding. The trade is the container:
 * this produces WebM (VP9/VP8), not MP4.
 *
 * `captureStream(0)` plus explicit `requestFrame()` means we drive the encoder
 * ourselves, one frame per render, instead of hoping the compositor samples
 * the canvas at the right moment. Pacing uses timers rather than
 * requestAnimationFrame so a backgrounded tab still records at full speed.
 *
 * The camera angle is driven by *elapsed time*, not by frame index. This
 * matters: MediaRecorder timestamps every frame by wall clock, so a scene that
 * cannot render at 30fps — six transmissive layers at high DPI will not — would
 * otherwise produce a clip several times longer than asked for, playing in slow
 * motion. Driving by time means a slow machine drops to a lower frame rate
 * instead, and the revolution still takes exactly the requested seconds.
 */
export function TurntableCapture() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3; enabled?: boolean } | null

  const size = useThree((s) => s.size)
  const request = useRuntimeStore((s) => s.turntableRequest)

  const sizeRef = useRef(size)
  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    if (request === 0) return
    let cancelled = false

    const run = async () => {
      const store = useRuntimeStore.getState()
      const mimeType = pickMimeType()
      if (!mimeType) {
        console.error('This browser cannot record WebM from a canvas.')
        return
      }

      const canvas = gl.domElement as HTMLCanvasElement & {
        captureStream?: (fps?: number) => MediaStream
      }
      if (!canvas.captureStream) {
        console.error('This browser does not support canvas.captureStream().')
        return
      }

      store.setRecording(true)
      store.setRecordProgress(0)
      store.setQuality('full')

      // WebM from MediaRecorder has no alpha channel, so a transparent
      // background would only record the flat, unshaded acrylic. Put the
      // studio sweep back for the duration of the capture.
      const previousBackground = scene.background
      if (!scene.background) scene.background = getSharedBackdropTexture()

      const target = controls?.target?.clone() ?? new THREE.Vector3()
      const startPosition = camera.position.clone()
      const wasEnabled = controls?.enabled ?? true
      if (controls) controls.enabled = false

      const radius = Math.hypot(startPosition.x - target.x, startPosition.z - target.z)
      const startAngle = Math.atan2(startPosition.z - target.z, startPosition.x - target.x)
      const height = startPosition.y
      const durationMs = store.turntableSeconds * 1000

      const stream = canvas.captureStream(0)
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
        requestFrame?: () => void
      }
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000,
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      const finished = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
      })

      const previousPixelRatio = gl.getPixelRatio()

      try {
        if ('transmissionResolutionScale' in gl) gl.transmissionResolutionScale = 1
        // Record at 1:1 with the viewport rather than at export DPI. A
        // 2× canvas costs four times the fill and readback per frame, which is
        // exactly what pushes the capture below its target frame rate.
        gl.setPixelRatio(1)
        gl.setSize(sizeRef.current.width, sizeRef.current.height, false)

        recorder.start()

        const frameMs = 1000 / FPS
        const startedAt = performance.now()
        let nextAt = startedAt
        let elapsed = 0

        while (elapsed < durationMs && !cancelled) {
          const angle = startAngle + (elapsed / durationMs) * Math.PI * 2
          camera.position.set(
            target.x + Math.cos(angle) * radius,
            height,
            target.z + Math.sin(angle) * radius,
          )
          camera.lookAt(target)
          gl.render(scene, camera)
          track.requestFrame?.()

          useRuntimeStore.getState().setRecordProgress(Math.min(1, elapsed / durationMs))

          // Aim for 30fps but never wait past it — if a frame overran, go
          // straight into the next one.
          nextAt += frameMs
          await delay(Math.max(0, nextAt - performance.now()))
          elapsed = performance.now() - startedAt
        }

        recorder.stop()
        await finished

        if (!cancelled && chunks.length) {
          triggerDownload(
            new Blob(chunks, { type: mimeType }),
            timestampedFilename('acrylic-turntable', 'webm'),
          )
        }
      } catch (error) {
        console.error('Turntable capture failed', error)
      } finally {
        scene.background = previousBackground
        gl.setPixelRatio(previousPixelRatio)
        gl.setSize(sizeRef.current.width, sizeRef.current.height, false)
        camera.position.copy(startPosition)
        camera.lookAt(target)
        if (controls) controls.enabled = wasEnabled
        stream.getTracks().forEach((t) => t.stop())
        useRuntimeStore.getState().setRecording(false)
        useRuntimeStore.getState().setRecordProgress(0)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [request, gl, scene, camera, controls])

  return null
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function pickMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}
