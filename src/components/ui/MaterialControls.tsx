import { useConfigStore } from '../../store/configStore'
import type { MaterialFinish } from '../../types/config'
import { ColorField, SegmentedControl, Slider } from './controls'

export function MaterialControls() {
  const material = useConfigStore((s) => s.config.material)
  const patchSection = useConfigStore((s) => s.patchSection)

  return (
    <>
      <SegmentedControl<MaterialFinish>
        label="Finish"
        value={material.finish}
        options={[
          { value: 'clear', label: 'Clear' },
          { value: 'frosted', label: 'Frosted' },
          { value: 'tinted', label: 'Tinted' },
        ]}
        onChange={(finish) => patchSection('material', { finish })}
      />

      {material.finish === 'tinted' && (
        <ColorField
          label="Tint"
          value={material.tintColor}
          hint="Absorbed through the body of the acrylic, so thicker panels read as more saturated."
          onChange={(tintColor) => patchSection('material', { tintColor })}
        />
      )}

      <Slider
        label="Edge glow"
        value={material.edgeGlow}
        min={0}
        max={1}
        step={0.01}
        precision={2}
        hint="Stylised rim light on the cut edge, the way real edge-lit acrylic pipes light."
        onChange={(edgeGlow) => patchSection('material', { edgeGlow })}
      />

      <Slider
        label="Surface roughness"
        value={material.roughness}
        min={0}
        max={0.6}
        step={0.01}
        precision={2}
        hint={
          material.finish === 'frosted'
            ? 'Frosted enforces a roughness floor, so low values have no effect here.'
            : undefined
        }
        onChange={(roughness) => patchSection('material', { roughness })}
      />

      <Slider
        label="Index of refraction"
        value={material.ior}
        min={1.2}
        max={1.8}
        step={0.01}
        precision={2}
        hint="Cast acrylic is 1.49. Higher values bend the background more."
        onChange={(ior) => patchSection('material', { ior })}
      />
    </>
  )
}
