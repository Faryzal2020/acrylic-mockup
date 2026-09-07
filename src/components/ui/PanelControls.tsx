import { useConfigStore } from '../../store/configStore'
import type { PanelShape } from '../../types/config'
import { SegmentedControl, Slider } from './controls'

/**
 * Panel-wide silhouette settings. Anything per-layer — thickness, gap,
 * artwork, placement — lives in LayerEditor instead.
 */
export function PanelControls() {
  const panel = useConfigStore((s) => s.config.panel)
  const patchSection = useConfigStore((s) => s.patchSection)
  const hasArtwork = useConfigStore((s) =>
    s.config.layers.some((l) => l.imageAssetId && s.assets[l.imageAssetId]),
  )

  const traced = panel.shape === 'traceFromAlpha'

  return (
    <>
      <SegmentedControl<PanelShape>
        label="Cut shape"
        value={panel.shape}
        options={[
          { value: 'traceFromAlpha', label: 'Trace artwork' },
          { value: 'rounded', label: 'Rectangle' },
        ]}
        hint={
          traced && !hasArtwork
            ? 'Upload artwork to trace — until then the panel stays rectangular.'
            : traced
              ? 'The cut line follows the artwork’s alpha channel, with a clear border outside it.'
              : undefined
        }
        onChange={(shape) => patchSection('panel', { shape })}
      />

      <Slider
        label={traced ? 'Standee height' : 'Panel height'}
        value={panel.heightMm}
        min={40}
        max={300}
        step={1}
        unit=" mm"
        hint={
          traced
            ? 'Overall height of the finished cut, border included.'
            : 'Panel width follows the artwork’s aspect ratio.'
        }
        onChange={(heightMm) => patchSection('panel', { heightMm })}
      />

      {traced ? (
        <Slider
          label="Cut border"
          value={panel.borderMm}
          min={0}
          max={12}
          step={0.5}
          precision={1}
          unit=" mm"
          hint="Clear acrylic left outside the artwork, the way a real standee is cut."
          onChange={(borderMm) => patchSection('panel', { borderMm })}
        />
      ) : (
        <Slider
          label="Corner radius"
          value={panel.cornerRadiusMm}
          min={0}
          max={20}
          step={0.5}
          precision={1}
          unit=" mm"
          onChange={(cornerRadiusMm) => patchSection('panel', { cornerRadiusMm })}
        />
      )}

    </>
  )
}
