import { useConfigStore } from '../../store/configStore'
import type { BaseShape } from '../../types/config'
import { AssetDropzone } from './AssetDropzone'
import { AssetPicker } from './AssetPicker'
import { ColorField, Field, SegmentedControl, Slider, Toggle } from './controls'

export function BaseControls() {
  const base = useConfigStore((s) => s.config.base)
  const tabWidthMm = useConfigStore((s) => s.config.panel.tabWidthMm)
  const panelTraced = useConfigStore((s) => s.config.panel.shape === 'traceFromAlpha')
  const hasAssets = useConfigStore((s) => Object.keys(s.assets).length > 0)
  const patchSection = useConfigStore((s) => s.patchSection)
  const setBaseArtwork = useConfigStore((s) => s.setBaseArtwork)

  const traced = base.shape === 'traceFromAlpha'

  const shapeOptions: { value: BaseShape; label: string }[] = [
    { value: 'circle', label: 'Circle' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'rectangle', label: 'Rect' },
  ]
  if (base.imageAssetId) shapeOptions.push({ value: 'traceFromAlpha', label: 'Traced' })

  return (
    <>
      <Toggle
        label="Show base"
        checked={base.enabled}
        onChange={(enabled) => patchSection('base', { enabled })}
      />

      {base.enabled && (
        <>
          <Field
            label="Base artwork"
            hint="Drawn as seen from above. Adding one cuts the plate to its outline."
          >
            <AssetDropzone
              label="Drop a PNG for the base shape"
              multiple={false}
              onAssigned={setBaseArtwork}
            />
          </Field>

          {hasAssets && (
            <Field label="Or pick from uploads">
              <AssetPicker value={base.imageAssetId} onChange={setBaseArtwork} />
            </Field>
          )}

          {base.imageAssetId && (
            <Toggle
              label="Print artwork on base"
              checked={base.imageOnBase}
              onChange={(imageOnBase) => patchSection('base', { imageOnBase })}
            />
          )}

          <SegmentedControl<BaseShape>
            label="Shape"
            value={base.shape}
            options={shapeOptions}
            onChange={(shape) => patchSection('base', { shape })}
          />

          <Slider
            label="Base size"
            value={base.diameter}
            min={25}
            max={160}
            step={1}
            unit=" mm"
            hint={
              traced
                ? 'Measured across the traced outline; the depth follows the artwork.'
                : 'Diameter for a circular base.'
            }
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
            disabled={!panelTraced}
            hint={
              panelTraced
                ? 'The tab drops out of the bottom of the artwork and through the slot. Set to 0 for no tab.'
                : 'A rectangular panel has no separate tab — its whole bottom edge slots in.'
            }
            onChange={(tabWidthMm) => patchSection('panel', { tabWidthMm })}
          />

          <Toggle
            label="Tint base"
            checked={base.tintEnabled}
            onChange={(tintEnabled) => patchSection('base', { tintEnabled })}
          />

          {base.tintEnabled && (
            <ColorField
              label="Base tint"
              value={base.color}
              hint="Absorbed through the plate, the same way the panel's tint works."
              onChange={(color) => patchSection('base', { color })}
            />
          )}
        </>
      )}
    </>
  )
}
