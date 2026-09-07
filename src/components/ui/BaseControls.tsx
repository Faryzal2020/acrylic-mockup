import { useConfigStore } from '../../store/configStore'
import type { BaseShape } from '../../types/config'
import { ColorField, SegmentedControl, Slider, Toggle } from './controls'

export function BaseControls() {
  const base = useConfigStore((s) => s.config.base)
  const patchSection = useConfigStore((s) => s.patchSection)

  return (
    <>
      <Toggle
        label="Show base"
        checked={base.enabled}
        onChange={(enabled) => patchSection('base', { enabled })}
      />

      {base.enabled && (
        <>
          <SegmentedControl<BaseShape>
            label="Shape"
            value={base.shape === 'traceFromAlpha' ? 'rounded' : base.shape}
            options={[
              { value: 'rectangle', label: 'Rectangle' },
              { value: 'rounded', label: 'Rounded' },
            ]}
            onChange={(shape) => patchSection('base', { shape })}
          />

          <Slider
            label="Base height"
            value={base.height}
            min={4}
            max={40}
            step={1}
            unit=" mm"
            onChange={(height) => patchSection('base', { height })}
          />

          <Slider
            label="Base depth"
            value={base.depth}
            min={10}
            max={80}
            step={1}
            unit=" mm"
            onChange={(depth) => patchSection('base', { depth })}
          />

          <ColorField
            label="Base tint"
            value={base.color}
            hint="Tints the acrylic body of the stand. Near-white reads as clear."
            onChange={(color) => patchSection('base', { color })}
          />
        </>
      )}
    </>
  )
}
