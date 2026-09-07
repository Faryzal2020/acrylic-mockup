import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { loadImageAsset } from '../../lib/textureLoader'
import { useConfigStore } from '../../store/configStore'
import { Button } from './controls'
import { useSelectedLayer } from './useSelectedLayer'

/**
 * PNG upload. Everything happens in the browser — the file is decoded to a
 * texture and never uploaded anywhere, which is what keeps this deployable as
 * a static site.
 */
export function ArtworkControls() {
  const assets = useConfigStore((s) => s.assets)
  const addAsset = useConfigStore((s) => s.addAsset)
  const removeAsset = useConfigStore((s) => s.removeAsset)
  const patchLayer = useConfigStore((s) => s.patchLayer)
  const layer = useSelectedLayer()
  const layerNumber = useConfigStore((s) => s.config.layers.indexOf(layer) + 1)

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ingest = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not an image.`)
        continue
      }
      try {
        const asset = await loadImageAsset(file)
        addAsset(asset)
        patchLayer(layer.id, { imageAssetId: asset.id })
      } catch {
        setError(`Could not read "${file.name}".`)
      }
    }
  }

  const list = Object.values(assets)

  return (
    <>
      <label
        className={`upload${dragging ? ' upload--dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void ingest(event.dataTransfer.files)
        }}
      >
        <ImagePlus size={20} aria-hidden />
        <span>Drop a transparent PNG, or click to browse</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/webp,image/*"
          multiple
          onChange={(event) => {
            void ingest(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      {error && <p className="field__hint">{error}</p>}

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
