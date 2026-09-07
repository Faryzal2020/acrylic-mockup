import { Canvas } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { getSceneDimensions } from '../../lib/dimensions'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'
import type { MockupConfig } from '../../types/config'
import { CAMERA_FOV, getCameraShot } from '../../lib/cameraShots'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { ExportCapture } from './ExportCapture'
import { LightingRig } from './LightingRig'
import { TransparentPreview } from './TransparentPreview'
import { TurntableCapture } from './TurntableCapture'
import { MockupModel } from './MockupModel'
import { FpsMeter, QualityManager } from './QualityManager'

export function SceneCanvas() {
  const config = useConfigStore((s) => s.config)
  const assets = useConfigStore((s) => s.assets)
  const stressLayers = useRuntimeStore((s) => s.stressLayers)

  // Phase 0 spike hook: repeating the stack lets us measure the cost of a
  // realistic 3- or 6-layer build without hand-authoring one.
  const effectiveConfig = useMemo<MockupConfig>(() => {
    if (stressLayers <= 1) return config
    const layers = Array.from({ length: stressLayers }, (_, copy) =>
      config.layers.map((layer, index) => ({
        ...layer,
        id: `${layer.id}::${copy}`,
        gapBefore: copy === 0 && index === 0 ? 0 : layer.gapBefore || 2,
      })),
    ).flat()
    return { ...config, layers }
  }, [config, stressLayers])

  const dims = useMemo(
    () => getSceneDimensions(effectiveConfig, assets),
    [effectiveConfig, assets],
  )

  // Only the very first framing — after mount, CameraRig owns the camera.
  const [initialShot] = useState(() => getCameraShot('threeQuarter', dims))

  return (
    <Canvas
      // DPR is driven imperatively by QualityManager, so start at 1 and let it
      // raise the resolution once the scene settles.
      dpr={1}
      gl={{
        antialias: true,
        // Required so the export path can read the drawing buffer back.
        preserveDrawingBuffer: true,
        // Leave `alpha` at its default. Setting it false makes three's clear
        // alpha 1, which fills drei's ContactShadows render target with opaque
        // black and paints a grey slab across the floor. The canvas still
        // reads as opaque because scene.background paints the backdrop.
      }}
      camera={{
        fov: CAMERA_FOV,
        near: 0.005,
        far: 50,
        position: initialShot.position.toArray(),
      }}
      onCreated={({ gl }) => {
        // Neutral (KHR) rather than ACES: ACES pulls a white studio toward
        // grey, which fights the bright look the product needs. Neutral keeps
        // whites white and still rolls off the specular highlights.
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <Backdrop mode={config.background.mode} color={config.background.color} />
      <QualityManager />
      <FpsMeter />
      <ExportCapture />
      <TurntableCapture />
      <TransparentPreview />

      <LightingRig
        preset={config.lighting.preset}
        intensity={config.lighting.environmentIntensity}
      />

      <MockupModel config={effectiveConfig} dims={dims} />

      <CameraRig dims={dims} />
    </Canvas>
  )
}
