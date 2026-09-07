import { useConfigStore } from '../../store/configStore'
import type { BackgroundMode } from '../../types/config'
import { ColorField, SegmentedControl } from './controls'

export function BackgroundControls() {
  const background = useConfigStore((s) => s.config.background)
  const patchSection = useConfigStore((s) => s.patchSection)

  return (
    <>
      <SegmentedControl<BackgroundMode>
        label="Behind the product"
        value={background.mode}
        options={[
          { value: 'studio', label: 'Studio' },
          { value: 'solid', label: 'Solid' },
          { value: 'transparent', label: 'None' },
        ]}
        onChange={(mode) => patchSection('background', { mode })}
      />

      {background.mode === 'solid' && (
        <ColorField
          label="Colour"
          value={background.color}
          onChange={(color) => patchSection('background', { color })}
        />
      )}

      <p className="field__hint">
        {background.mode === 'transparent'
          ? 'Exports a PNG with a transparent background. Clear acrylic stays semi-transparent so it composites over whatever you drop it on; the printed artwork stays opaque.'
          : 'The background is baked into the exported PNG. Choose None for a transparent one.'}
      </p>
    </>
  )
}
