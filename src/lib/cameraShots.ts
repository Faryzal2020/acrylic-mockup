import * as THREE from 'three'
import type { CameraPreset } from '../types/config'
import type { SceneDimensions } from './dimensions'

/** Vertical field of view, in degrees. Mildly long — flattering for product shots. */
export const CAMERA_FOV = 32

/** Nominal viewport aspect used to fit the subject horizontally. */
const NOMINAL_ASPECT = 1.3

export type CameraShot = {
  position: THREE.Vector3
  target: THREE.Vector3
}

/**
 * Preset framings are solved from the product's actual bounding size rather
 * than from magic distance multipliers, so a 40mm keychain and a 300mm standee
 * are both framed the same way and the shots stay valid as the panel resizes.
 *
 * Each preset supplies a viewing direction and how much of the frame the
 * product should fill; distance falls out of the field of view.
 */
export function getCameraShot(preset: CameraPreset, dims: SceneDimensions): CameraShot {
  const totalHeight = dims.panelCentreY + dims.panelHeight / 2
  const totalWidth = Math.max(dims.panelWidth, dims.base.width)

  const shot = SHOTS[preset] ?? SHOTS.threeQuarter
  const distance = solveDistance(totalHeight, totalWidth, shot.fill)

  const target = new THREE.Vector3(
    dims.panelWidth * shot.target[0],
    totalHeight * shot.target[1],
    0,
  )
  const direction = new THREE.Vector3(...shot.direction).normalize()

  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
  }
}

type ShotSpec = {
  /** Unit-ish camera offset from the target; normalised before use. */
  direction: [number, number, number]
  /**
   * How much of the frame the product occupies. Values above 1 deliberately
   * overflow the frame — that is what makes a close-up crop in rather than
   * pull back.
   */
  fill: number
  /**
   * Aim point: x as a fraction of the panel's half-width (0.5 lands on the
   * cut edge), y as a fraction of the product's total height.
   */
  target: [number, number]
}

const SHOTS: Record<CameraPreset, ShotSpec> = {
  threeQuarter: { direction: [0.62, 0.3, 1], fill: 0.72, target: [0, 0.5] },
  front: { direction: [0, 0.06, 1], fill: 0.8, target: [0, 0.5] },
  // Tight on the cut edge, from nearly side-on, to show off the thickness.
  edgeCloseup: { direction: [1, 0.26, 0.44], fill: 1.15, target: [0.5, 0.5] },
  custom: { direction: [0.62, 0.3, 1], fill: 0.72, target: [0, 0.5] },
}

function solveDistance(height: number, width: number, fill: number) {
  const halfFov = (CAMERA_FOV * Math.PI) / 360
  const visibleHeight = height / fill
  const visibleHeightForWidth = width / fill / NOMINAL_ASPECT
  return Math.max(visibleHeight, visibleHeightForWidth) / (2 * Math.tan(halfFov))
}
