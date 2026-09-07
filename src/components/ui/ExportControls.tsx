import { Download } from 'lucide-react'
import { useRuntimeStore } from '../../store/runtimeStore'
import { Button, SegmentedControl } from './controls'

export function ExportControls({ viewport }: { viewport: { width: number; height: number } }) {
  const exportScale = useRuntimeStore((s) => s.exportScale)
  const exporting = useRuntimeStore((s) => s.exporting)
  const setExportScale = useRuntimeStore((s) => s.setExportScale)
  const requestExport = useRuntimeStore((s) => s.requestExport)

  const width = Math.round(viewport.width * exportScale)
  const height = Math.round(viewport.height * exportScale)

  return (
    <>
      <SegmentedControl
        label="Resolution"
        value={String(exportScale)}
        options={[
          { value: '1', label: '1×' },
          { value: '2', label: '2×' },
          { value: '3', label: '3×' },
        ]}
        hint={`Exports at ${width} × ${height} px, rendered at full transmission quality.`}
        onChange={(value) => setExportScale(Number(value))}
      />

      <Button variant="primary" block disabled={exporting} onClick={requestExport}>
        <Download size={14} aria-hidden />
        {exporting ? 'Rendering…' : 'Export still (PNG)'}
      </Button>

      <p className="field__hint">
        The export re-renders the settled, full-quality frame — it does not screenshot the
        reduced-quality preview you see while dragging.
      </p>
    </>
  )
}
