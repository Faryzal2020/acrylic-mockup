import type * as THREE from 'three'
import { getSharedBackdropTexture } from './backdrop'

/**
 * Renders a transparent-background frame that still carries the studio's
 * shading.
 *
 * Why this cannot be one pass: three's `_renderBackground` is a single flag
 * shared by the main render and the transmission pass, and
 * `renderTransmissionPass` calls `background.render(scene)` from it. Null the
 * background for transparency and the transmission target keeps only its
 * `setClearColor(0xffffff, 0.5)` clear, so every clear-acrylic pixel comes out
 * as exactly 255,255,255 at alpha 128 — one flat constant with no tonal
 * variation anywhere on the panel.
 *
 * So we render twice (or three times) and combine:
 *
 *   A  backdrop on   -> the product as it looks in the studio, alpha 255
 *   B  backdrop off  -> the alpha matte (acrylic ~128, print 255, empty 0)
 *   C  backdrop only -> what was behind the product, per pixel
 *
 * `exact` un-premultiplies A against C so the result composites correctly over
 * a new background:  out = (A - C * (1 - a)) / a. C is measured rather than
 * recomputed from the gradient, which keeps it immune to colour-space and
 * tone-mapping differences between how we built the texture and how three
 * draws it.
 *
 * The fast path skips C and just masks A with B's alpha. Visually very close
 * on light backgrounds and it costs one canvas composite instead of a
 * multi-million-pixel loop, which is what makes it usable for the live
 * preview.
 *
 * Worth knowing: a clear panel lit by a white studio genuinely does veil a
 * dark background. That is what the acrylic is carrying, not an artefact.
 */
export function composeTransparentFrame({
  gl,
  scene,
  camera,
  target,
  exact,
}: {
  gl: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  target: HTMLCanvasElement
  exact: boolean
}) {
  const source = gl.domElement as HTMLCanvasElement
  const width = source.width
  const height = source.height

  target.width = width
  target.height = height

  const ctx = target.getContext('2d', { willReadFrequently: exact })
  if (!ctx) throw new Error('2D context unavailable for the transparent composite.')

  const previousBackground = scene.background
  const backdrop = getSharedBackdropTexture()

  try {
    // Pass A — the studio render.
    scene.background = backdrop
    gl.render(scene, camera)
    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(source, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const studio = exact ? ctx.getImageData(0, 0, width, height) : null

    // Pass B — the matte.
    scene.background = null
    gl.render(scene, camera)

    if (!studio) {
      // Keep A's colour, take B's coverage. One GPU composite, no pixel loop.
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(source, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      return
    }

    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(source, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const matte = ctx.getImageData(0, 0, width, height)

    // Pass C — the backdrop with the product taken out of the scene.
    scene.background = backdrop
    const hidden: THREE.Object3D[] = []
    for (const child of scene.children) {
      if (child.visible) {
        child.visible = false
        hidden.push(child)
      }
    }
    gl.render(scene, camera)
    for (const child of hidden) child.visible = true

    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(source, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const behind = ctx.getImageData(0, 0, width, height)

    unpremultiply(studio.data, matte.data, behind.data)
    ctx.putImageData(studio, 0, 0)
  } finally {
    scene.background = previousBackground
  }
}

function unpremultiply(
  studio: Uint8ClampedArray,
  matte: Uint8ClampedArray,
  behind: Uint8ClampedArray,
) {
  for (let i = 0; i < studio.length; i += 4) {
    const alpha = matte[i + 3]

    if (alpha === 0) {
      studio[i] = 0
      studio[i + 1] = 0
      studio[i + 2] = 0
      studio[i + 3] = 0
      continue
    }

    if (alpha === 255) {
      studio[i + 3] = 255
      continue
    }

    const scale = 255 / alpha
    const behindShare = (255 - alpha) / 255

    // Uint8ClampedArray clamps to 0-255 on assignment, so partial coverage
    // that would otherwise overshoot lands in range without extra work.
    studio[i] = (studio[i] - behind[i] * behindShare) * scale
    studio[i + 1] = (studio[i + 1] - behind[i + 1] * behindShare) * scale
    studio[i + 2] = (studio[i + 2] - behind[i + 2] * behindShare) * scale
    studio[i + 3] = alpha
  }
}

/**
 * The 2D canvas layered over the WebGL one to show the settled transparent
 * preview. Registered by App rather than passed through the store: it is a DOM
 * node used imperatively, and nothing should re-render when it changes.
 */
let overlay: HTMLCanvasElement | null = null

export const setOverlayCanvas = (canvas: HTMLCanvasElement | null) => {
  overlay = canvas
}

export const getOverlayCanvas = () => overlay
