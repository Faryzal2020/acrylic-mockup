import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'
import type { CameraPreset, LightingPreset } from '../../types/config'
import { Button, SegmentedControl, Slider } from './controls'

export function CameraLightingControls() {
  const camera = useConfigStore((s) => s.config.camera)
  const lighting = useConfigStore((s) => s.config.lighting)
  const patchSection = useConfigStore((s) => s.patchSection)
  const recallCamera = useRuntimeStore((s) => s.recallCamera)
  const saveCamera = useRuntimeStore((s) => s.saveCamera)
  const hasSavedView = Boolean(camera.position && camera.target)

  return (
    <>
      <SegmentedControl<CameraPreset>
        label="Camera"
        value={camera.preset}
        options={[
          { value: 'threeQuarter', label: '3/4' },
          { value: 'front', label: 'Front' },
          { value: 'edgeCloseup', label: 'Edge' },
        ]}
        hint={
          camera.preset === 'custom'
            ? 'Custom view — orbiting the viewport saved this framing. Pick a preset to reset it.'
            : 'Drag in the viewport to orbit; the preset switches to Custom.'
        }
        onChange={(preset) => patchSection('camera', { preset })}
      />

      <div className="row">
        <Button block onClick={saveCamera}>
          <Bookmark size={13} aria-hidden />
          Save view
        </Button>
        <Button block disabled={!hasSavedView} onClick={recallCamera}>
          <BookmarkCheck size={13} aria-hidden />
          Recall view
        </Button>
      </div>

      <p className="field__hint">
        Orbit to the framing you want, save it, and it survives switching to a preset and back.
      </p>

      <SegmentedControl<LightingPreset>
        label="Lighting"
        value={lighting.preset}
        options={[
          { value: 'studioSoft', label: 'Soft' },
          { value: 'studioHard', label: 'Hard' },
          { value: 'daylight', label: 'Daylight' },
        ]}
        onChange={(preset) => patchSection('lighting', { preset })}
      />

      <Slider
        label="Environment intensity"
        value={lighting.environmentIntensity}
        min={0.2}
        max={3}
        step={0.05}
        precision={2}
        unit="×"
        onChange={(environmentIntensity) =>
          patchSection('lighting', { environmentIntensity })
        }
      />
    </>
  )
}
