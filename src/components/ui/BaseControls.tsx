import { useConfigStore } from '../../store/configStore'
import type { BaseShape } from '../../types/config'
import { ColorField, SegmentedControl, Slider, Toggle } from './controls'

export function BaseControls() {
  const base = useConfigStore((s) => s.config.base)
  const tabWidthMm = useConfigStore((s) => s.config.panel.tabWidthMm)
  const traced = useConfigStore((s) => s.config.panel.shape === 'traceFromAlpha')
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
            value={base.shape}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'rectangle', label: 'Rectangle' },
            ]}
            onChange={(shape) => patchSection('base', { shape })}
          />

          <Slider
            label="Base size"
            value={base.diameter}
            min={25}
            max={160}
            step={1}
            unit=" mm"
            hint="Diameter for a circular base."
            onChange={(diameter) => patchSection('base', { diameter })}
          />

          <Slider
            label="Base thickness"
            value={base.thickness}
            min={2}
            max={10}
            step={0.5}
            precision={1}
            unit=" mm"
            hint="The base is cut from sheet acrylic too — 3 mm is the usual stock."
            onChange={(thickness) => patchSection('base', { thickness })}
          />

          <Slider
            label="Tab width"
            value={tabWidthMm}
            min={0}
            max={60}
            step={1}
            unit=" mm"
            disabled={!traced}
            hint={
              traced
                ? 'The tab drops out of the bottom of the artwork and through the slot. Set to 0 for no tab.'
                : 'A rectangular panel has no separate tab — its whole bottom edge slots in.'
            }
            onChange={(tabWidthMm) => patchSection('panel', { tabWidthMm })}
          />

          <ColorField
            label="Base tint"
            value={base.color}
            hint="Tints the acrylic body of the plate. Near-white reads as clear."
            onChange={(color) => patchSection('base', { color })}
          />
        </>
      )}
    </>
  )
}
