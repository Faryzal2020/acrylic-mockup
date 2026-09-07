import * as THREE from 'three'
import type { ImageAsset } from '../store/configStore'
import { extractAlphaMask } from './alphaMask'

/**
 * Reads a user-supplied PNG into a texture. Everything stays client-side:
 * the file never leaves the browser, which is what lets this deploy to
 * GitHub Pages with no backend.
 */
export async function loadImageAsset(file: File): Promise<ImageAsset> {
  const url = URL.createObjectURL(file)
  try {
    // ImageBitmap arrives in natural top-down orientation. Flipping it at
    // decode time and turning three's own flipY off is the reliable pairing —
    // relying on UNPACK_FLIP_Y for ImageBitmap renders the art upside down.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'flipY' })
    const texture = new THREE.Texture(bitmap)
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true

    return {
      id: crypto.randomUUID(),
      name: file.name,
      url,
      width: bitmap.width,
      height: bitmap.height,
      texture,
      alphaMask: extractAlphaMask(bitmap),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}
