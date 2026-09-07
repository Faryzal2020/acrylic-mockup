import { Video } from 'lucide-react'
import { useRuntimeStore } from '../../store/runtimeStore'
import { Button, Slider, Toggle } from './controls'

export function TurntableControls() {
  const seconds = useRuntimeStore((s) => s.turntableSeconds)
  const recording = useRuntimeStore((s) => s.recording)
  const progress = useRuntimeStore((s) => s.recordProgress)
  const lowPower = useRuntimeStore((s) => s.lowPowerPreview)
  const setTurntableSeconds = useRuntimeStore((s) => s.setTurntableSeconds)
  const requestTurntable = useRuntimeStore((s) => s.requestTurntable)
  const setLowPowerPreview = useRuntimeStore((s) => s.setLowPowerPreview)

  return (
    <>
      <Slider
        label="Turntable length"
        value={seconds}
        min={2}
        max={15}
        step={1}
        unit=" s"
        disabled={recording}
        hint="One full revolution at 30 fps, orbiting from wherever the camera is now."
        onChange={setTurntableSeconds}
      />

      <Button variant="primary" block disabled={recording} onClick={requestTurntable}>
        <Video size={14} aria-hidden />
        {recording ? `Recording… ${Math.round(progress * 100)}%` : 'Export turntable (WebM)'}
      </Button>

      <p className="field__hint">
        Encoded by the browser as WebM — no video library to download, but not MP4. Convert
        afterwards if you need one.
      </p>

      <Toggle
        label="Low-power preview"
        checked={lowPower}
        onChange={setLowPowerPreview}
      />

      <p className="field__hint">
        Drops transmission for plain transparency while you drag, which skips an entire render
        pass. The preview looks flatter mid-drag; stills and turntables are unaffected.
      </p>
    </>
  )
}
