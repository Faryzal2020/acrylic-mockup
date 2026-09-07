import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { getCameraShot, type CameraShot } from '../../lib/cameraShots'
import type { SceneDimensions } from '../../lib/dimensions'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'

/** Exponential approach rate for the preset tween. */
const TWEEN_RATE = 6

export function CameraRig({ dims }: { dims: SceneDimensions }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const preset = useConfigStore((s) => s.config.camera.preset)
  const patchSection = useConfigStore((s) => s.patchSection)
  const beginInteraction = useRuntimeStore((s) => s.beginInteraction)
  const endInteraction = useRuntimeStore((s) => s.endInteraction)
  const cameraRecall = useRuntimeStore((s) => s.cameraRecall)
  const cameraSave = useRuntimeStore((s) => s.cameraSave)
  const savedPosition = useConfigStore((s) => s.config.camera.position)
  const savedTarget = useConfigStore((s) => s.config.camera.target)

  const goal = useRef<CameraShot | null>(null)
  const dragging = useRef(false)
  const snapped = useRef(false)

  // A preset change (or a resize of the product) re-aims the camera. A custom
  // view is left alone so the user's own framing survives config edits.
  useEffect(() => {
    if (preset === 'custom') return
    const shot = getCameraShot(preset, dims)

    // The first framing is applied instantly — a fly-in on page load would be
    // noise. Later preset changes tween so the user can follow the move.
    if (!snapped.current) {
      snapped.current = true
      const controls = controlsRef.current
      camera.position.copy(shot.position)
      if (controls) {
        controls.target.copy(shot.target)
        controls.update()
      }
      return
    }

    goal.current = shot
  }, [preset, dims, camera])

  // Recall is an explicit act, so it is driven by a counter rather than by the
  // preset — the preset is already 'custom' the moment the user orbits, and we
  // do not want a stray re-render flying the camera somewhere.
  useEffect(() => {
    if (cameraRecall === 0 || !savedPosition || !savedTarget) return
    goal.current = {
      position: new THREE.Vector3(...savedPosition),
      target: new THREE.Vector3(...savedTarget),
    }
  }, [cameraRecall, savedPosition, savedTarget])

  useEffect(() => {
    if (cameraSave === 0) return
    const controls = controlsRef.current
    if (!controls) return
    patchSection('camera', {
      preset: 'custom',
      position: camera.position.toArray() as [number, number, number],
      target: controls.target.toArray() as [number, number, number],
    })
    // Only the counter should trigger this; the camera moves constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraSave])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    const shot = goal.current
    if (!controls || !shot || dragging.current) return

    const t = 1 - Math.exp(-TWEEN_RATE * delta)
    camera.position.lerp(shot.position, t)
    controls.target.lerp(shot.target, t)
    controls.update()

    if (
      camera.position.distanceTo(shot.position) < 1e-4 &&
      controls.target.distanceTo(shot.target) < 1e-4
    ) {
      camera.position.copy(shot.position)
      controls.target.copy(shot.target)
      controls.update()
      goal.current = null
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={dims.panelHeight * 0.35}
      maxDistance={dims.panelHeight * 8}
      // Keep the camera above the floor so the product never appears to float.
      maxPolarAngle={Math.PI * 0.52}
      onStart={() => {
        dragging.current = true
        goal.current = null
        beginInteraction()
        if (useConfigStore.getState().config.camera.preset !== 'custom') {
          patchSection('camera', { preset: 'custom' })
        }
      }}
      onEnd={() => {
        dragging.current = false
        // Free orbiting marks the view custom but deliberately does not touch
        // the saved view — otherwise "save this view" would mean nothing.
        endInteraction()
      }}
    />
  )
}
