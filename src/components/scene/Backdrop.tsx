import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getSharedBackdropTexture } from '../../lib/backdrop'
import type { BackgroundMode } from '../../types/config'

/**
 * Drives what sits behind the product, for both the preview and the export.
 *
 * Note what this deliberately does *not* touch: the renderer's clear alpha. It
 * has to stay at 0 so drei's ContactShadows render target clears transparent —
 * setting it to 1 fills that target with opaque black and paints a grey slab
 * across the floor. In studio and solid modes the background quad paints over
 * the transparent clear anyway, so the exported PNG is still fully opaque.
 *
 * In transparent mode nothing paints, so the PNG keeps its alpha. three's
 * transmission pass clears its own target to white at half alpha, so the
 * acrylic refracts a neutral field rather than a black void, and comes out
 * semi-transparent — which is what you want compositing a clear panel over
 * someone else's background. The printed artwork stays fully opaque.
 */
export function Backdrop({ mode, color }: { mode: BackgroundMode; color: string }) {
  const scene = useThree((s) => s.scene)

  const gradient = useMemo(() => getSharedBackdropTexture(), [])

  useEffect(() => {
    if (mode === 'studio') {
      scene.background = gradient
    } else if (mode === 'solid') {
      scene.background = new THREE.Color(color)
    } else {
      scene.background = null
    }

    return () => {
      scene.background = null
    }
  }, [scene, mode, color, gradient])

  return null
}
