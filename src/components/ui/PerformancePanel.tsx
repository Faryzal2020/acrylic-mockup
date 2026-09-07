import { useRuntimeStore } from '../../store/runtimeStore'
import { SegmentedControl } from './controls'

/**
 * Phase 0 instrumentation. Multiplies the stack so the transmission cost at a
 * realistic layer count can be measured before the multi-layer UI exists.
 */
export function PerformancePanel() {
  const stressLayers = useRuntimeStore((s) => s.stressLayers)
  const setStressLayers = useRuntimeStore((s) => s.setStressLayers)
  const fps = useRuntimeStore((s) => s.fps)
  const quality = useRuntimeStore((s) => s.quality)

  return (
    <>
      <SegmentedControl
        label="Stacked layers (spike)"
        value={String(stressLayers)}
        options={[
          { value: '1', label: '1' },
          { value: '3', label: '3' },
          { value: '6', label: '6' },
        ]}
        hint="Duplicates the panel to measure transmission cost at realistic stack depths."
        onChange={(value) => setStressLayers(Number(value))}
      />

      <div className="note">
        <strong>{fps} fps</strong> at {quality === 'full' ? 'full' : 'preview'} quality.
        Preview quality (device pixel ratio 1, half-resolution transmission sampler) kicks in
        while you orbit or drag a slider, and settles back ~300 ms after you stop.
      </div>
    </>
  )
}
