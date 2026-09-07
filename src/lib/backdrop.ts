import * as THREE from 'three'
import { sceneTheme } from '../styles/sceneTheme'

/**
 * A studio sweep as a screen-space background texture.
 *
 * Two reasons this beats a floor mesh: drei's ContactShadows renders the whole
 * scene into its depth pass, so a ground plane at y=0 gets captured as one
 * giant occluder; and a perfectly flat white void gives the transmissive
 * acrylic nothing to refract, which is what makes it read as glass. The soft
 * vertical falloff here is part of the render, not UI chrome — plan §2 allows
 * gradients inside the 3D view.
 */
export function createBackdropTexture(
  topColor: string,
  bottomColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas context unavailable for backdrop.')

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, topColor)
  gradient.addColorStop(0.62, bottomColor)
  gradient.addColorStop(1, bottomColor)
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

let shared: THREE.CanvasTexture | null = null

/**
 * The studio sweep, created once and reused.
 *
 * Shared because the transparent-background composite needs to render *with*
 * this exact backdrop even when the visible background is off — the acrylic
 * has to refract something, or it comes out as a flat constant.
 */
export function getSharedBackdropTexture(): THREE.CanvasTexture {
  shared ??= createBackdropTexture(sceneTheme.backdropTop, sceneTheme.backdropBottom)
  return shared
}
