import { Trash2 } from 'lucide-react'
import { useConfigStore } from '../../store/configStore'
import { AssetDropzone } from './AssetDropzone'
import { Button } from './controls'
import { useSelectedLayer } from './useSelectedLayer'

/** The session's artwork library, and which layer the next upload lands on. */
export function ArtworkControls() {
  const assets = useConfigStore((s) => s.assets)
  const removeAsset = useConfigStore((s) => s.removeAsset)
  const patchLayer = useConfigStore((s) => s.patchLayer)
  const layer = useSelectedLayer()
  const layerNumber = useConfigStore((s) => s.config.layers.indexOf(layer) + 1)

  const list = Object.values(assets)

  return (
    <>
      <AssetDropzone
        label="Drop a transparent PNG, or click to browse"
        onAssigned={(assetId) => patchLayer(layer.id, { imageAssetId: assetId })}
      />

      {list.length > 0 && (
        <ul className="asset-list">
          {list.map((asset) => {
            const selected = layer.imageAssetId === asset.id
            return (
              <li key={asset.id} className="row">
                <button
                  type="button"
                  className={`asset${selected ? ' asset--selected' : ''}`}
                  onClick={() => patchLayer(layer.id, { imageAssetId: asset.id })}
                >
                  <img className="asset__thumb" src={asset.url} alt="" />
                  <span className="asset__meta">
                    <span className="asset__name">{asset.name}</span>
                    <span className="asset__dims">
                      {asset.width}×{asset.height}
                    </span>
                  </span>
                </button>
                <Button
                  className="button--icon"
                  aria-label={`Remove ${asset.name}`}
                  onClick={() => removeAsset(asset.id)}
                >
                  <Trash2 size={13} aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="field__hint">
        Uploading or picking assigns the artwork to layer {layerNumber}. Select a different
        layer under Layers to assign there instead.
      </p>

      <p className="field__hint">
        Uploads live in this browser tab only. Reloading the page clears them — export a
        preset and keep your source PNGs alongside it.
      </p>
    </>
  )
}
