import { useRuntimeStore } from '../../store/runtimeStore'

/**
 * True while the low-power preview should stand in for real transmission —
 * only during interaction, and only if the user opted in. Off by default: the
 * transmission look is the point of the tool.
 */
export function useCheapMaterials(): boolean {
  return useRuntimeStore(
    (s) => s.lowPowerPreview && s.quality === 'preview' && !s.exporting && !s.recording,
  )
}
