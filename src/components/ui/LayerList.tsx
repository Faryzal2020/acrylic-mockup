import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import { useConfigStore } from '../../store/configStore'
import { useRuntimeStore } from '../../store/runtimeStore'
import { LayerEditor } from './LayerEditor'
import { Button } from './controls'
import { useSelectedLayer } from './useSelectedLayer'

/**
 * The stack, listed front-to-back — the reverse of how it is stored, because
 * that is the order you see it in the viewport.
 */
export function LayerList() {
  const layers = useConfigStore((s) => s.config.layers)
  const assets = useConfigStore((s) => s.assets)
  const addLayer = useConfigStore((s) => s.addLayer)
  const removeLayer = useConfigStore((s) => s.removeLayer)
  const moveLayer = useConfigStore((s) => s.moveLayer)
  const duplicateLayer = useConfigStore((s) => s.duplicateLayer)
  const setSelectedLayer = useRuntimeStore((s) => s.setSelectedLayer)

  const selected = useSelectedLayer()
  const ordered = [...layers].reverse()

  return (
    <>
      <div className="layer-list">
        {ordered.map((layer) => {
          const index = layers.indexOf(layer)
          const asset = layer.imageAssetId ? assets[layer.imageAssetId] : undefined
          const isSelected = layer.id === selected.id

          return (
            <div key={layer.id} className={`layer${isSelected ? ' layer--selected' : ''}`}>
              <div className="layer__row">
                <button
                  type="button"
                  className="layer__label"
                  onClick={() => setSelectedLayer(layer.id)}
                >
                  <span className="layer__index">{index + 1}</span>
                  {asset ? asset.name : 'No artwork'}
                </button>

                {asset ? (
                  <img className="layer__thumb" src={asset.url} alt="" />
                ) : (
                  <span className="layer__thumb layer__thumb--empty" />
                )}

                <Button
                  className="button--icon"
                  aria-label="Move layer forward"
                  disabled={index === layers.length - 1}
                  onClick={() => moveLayer(layer.id, 1)}
                >
                  <ChevronUp size={13} aria-hidden />
                </Button>
                <Button
                  className="button--icon"
                  aria-label="Move layer back"
                  disabled={index === 0}
                  onClick={() => moveLayer(layer.id, -1)}
                >
                  <ChevronDown size={13} aria-hidden />
                </Button>
                <Button
                  className="button--icon"
                  aria-label="Duplicate layer"
                  onClick={() => {
                    const id = duplicateLayer(layer.id)
                    if (id) setSelectedLayer(id)
                  }}
                >
                  <Copy size={13} aria-hidden />
                </Button>
                <Button
                  className="button--icon"
                  aria-label="Delete layer"
                  disabled={layers.length <= 1}
                  onClick={() => removeLayer(layer.id)}
                >
                  <Trash2 size={13} aria-hidden />
                </Button>
              </div>

              {isSelected && (
                <div className="layer__body">
                  <LayerEditor layer={layer} index={index} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Button block onClick={() => setSelectedLayer(addLayer())}>
        <Plus size={14} aria-hidden />
        Add layer
      </Button>

      <p className="field__hint">
        Layers stack back-to-front. The frontmost is listed first; the bottom of the list is
        the layer furthest from the camera.
      </p>
    </>
  )
}
