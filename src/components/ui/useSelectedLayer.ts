import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'
import type { AcrylicLayer } from '../../types/config'

/**
 * The layer the editor and artwork picker act on. Falls back to the first
 * layer, so a selection left dangling by a delete never breaks the panel.
 */
export function useSelectedLayer(): AcrylicLayer {
  const layers = useConfigStore((s) => s.config.layers)
  const selectedId = useRuntimeStore((s) => s.selectedLayerId)
  return layers.find((l) => l.id === selectedId) ?? layers[0]
}
