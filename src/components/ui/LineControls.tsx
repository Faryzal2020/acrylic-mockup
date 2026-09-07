import { useConfigStore } from '../../store/configStore'
import { ColorField, Slider, Toggle } from './controls'

export function LineControls() {
  const lines = useConfigStore((s) => s.config.lines)
  const patchSection = useConfigStore((s) => s.patchSection)

  const patchEdges = (patch: Partial<typeof lines.edges>) =>
    patchSection('lines', { edges: { ...lines.edges, ...patch } })
  const patchOutline = (patch: Partial<typeof lines.outline>) =>
    patchSection('lines', { outline: { ...lines.outline, ...patch } })

  return (
    <>
      <Toggle
        label="Edge lines"
        checked={lines.edges.enabled}
        onChange={(enabled) => patchEdges({ enabled })}
      />

      {lines.edges.enabled && (
        <>
          <Slider
            label="Edge width"
            value={lines.edges.width}
            min={0.5}
            max={8}
            step={0.1}
            precision={1}
            unit=" px"
            hint="Follows the cut contour and any sharp crease in the acrylic."
            onChange={(width) => patchEdges({ width })}
          />
          <ColorField
            label="Edge colour"
            value={lines.edges.color}
            onChange={(color) => patchEdges({ color })}
          />
        </>
      )}

      <Toggle
        label="Outline"
        checked={lines.outline.enabled}
        onChange={(enabled) => patchOutline({ enabled })}
      />

      {lines.outline.enabled && (
        <>
          <Slider
            label="Outline width"
            value={lines.outline.width}
            min={1}
            max={24}
            step={0.5}
            precision={1}
            unit=" px"
            hint="Drawn around each piece in the stack, not around the product as a whole."
            onChange={(width) => patchOutline({ width })}
          />
          <ColorField
            label="Outline colour"
            value={lines.outline.color}
            onChange={(color) => patchOutline({ color })}
          />
        </>
      )}

      <p className="field__hint">
        Both widths are in screen pixels, so they hold their weight as you orbit and scale
        with the export resolution rather than thinning out at 2× or 3×.
      </p>
    </>
  )
}
