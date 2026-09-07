import type { MockupConfig } from '../../types/config'

export type AcrylicMaterialProps = {
  transmission: number
  thickness: number
  ior: number
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
  attenuationColor: string
  attenuationDistance: number
  specularIntensity: number
  transparent: boolean
  opacity: number
  color: string
}

/**
 * The acrylic look, tuned in the Phase 0 spike.
 *
 * `transparent` stays false on purpose: a transmissive-but-opaque-listed
 * material is included in three's transmission render pass and sorts against
 * the depth buffer, which is what makes stacked layers read correctly.
 */
export function getAcrylicMaterialProps(
  material: MockupConfig['material'],
  thicknessMetres: number,
  cheap = false,
): AcrylicMaterialProps {
  const { finish, tintColor, ior, roughness } = material

  const frosted = finish === 'frosted'
  const tinted = finish === 'tinted'

  if (cheap) {
    // Low-power preview: plain alpha blending instead of transmission, which
    // drops the whole extra scene pass. Reads flatter, but only while the user
    // is actually dragging — it settles back to the real material.
    return {
      transmission: 0,
      thickness: 0,
      ior,
      roughness: frosted ? Math.max(roughness, 0.4) : roughness,
      metalness: 0,
      clearcoat: 0,
      clearcoatRoughness: 0.04,
      attenuationColor: '#ffffff',
      attenuationDistance: 100,
      specularIntensity: 1,
      transparent: true,
      opacity: frosted ? 0.5 : 0.32,
      color: tinted ? tintColor : '#ffffff',
    }
  }

  return {
    // Frosted acrylic still transmits, it just scatters; the roughness floor
    // below is what actually reads as "frosted".
    transmission: frosted ? 0.94 : 1,
    // Slightly over-reporting thickness deepens the internal refraction and
    // makes a 3mm sheet read as a real slab rather than a pane of glass.
    thickness: thicknessMetres * 1.6,
    ior,
    roughness: frosted ? Math.max(roughness, 0.4) : roughness,
    metalness: 0,
    clearcoat: frosted ? 0 : 1,
    clearcoatRoughness: 0.04,
    attenuationColor: tinted ? tintColor : '#ffffff',
    // Attenuation is a distance, so a fixed value would make a 1mm panel look
    // clear and a 12mm one look opaque. Scaling it with the slab keeps the
    // tint reading the same strength at any thickness — and it still deepens
    // slightly through the longer diagonal paths, which is the effect you
    // actually want. Effectively infinite = water-clear.
    attenuationDistance: tinted ? thicknessMetres * 1.1 : 100,
    specularIntensity: 1,
    transparent: false,
    opacity: 1,
    color: '#ffffff',
  }
}

/**
 * Cut acrylic edges pipe light along the sheet and glow. Rather than patching
 * a fresnel term into the shader, we exploit ExtrudeGeometry's two material
 * groups: group 0 is the front/back faces, group 1 is the extruded side wall,
 * so the "edge" gets its own material with a little emissive lift.
 */
export function getEdgeMaterialProps(
  material: MockupConfig['material'],
  thicknessMetres: number,
  cheap = false,
) {
  const base = getAcrylicMaterialProps(material, thicknessMetres, cheap)
  return {
    ...base,
    roughness: Math.min(base.roughness + 0.06, 1),
    transmission: base.transmission * 0.82,
    emissive: material.finish === 'tinted' ? material.tintColor : '#eaf6f6',
    emissiveIntensity: material.edgeGlow * 0.9,
  }
}
