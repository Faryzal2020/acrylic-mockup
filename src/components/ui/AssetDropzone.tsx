import { ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { loadImageAsset } from '../../lib/textureLoader'
import { useConfigStore } from '../../store/configStore'

/**
 * PNG upload. Everything happens in the browser — the file is decoded to a
 * texture and never uploaded anywhere, which is what keeps this deployable as
 * a static site.
 *
 * `onAssigned` fires per successfully loaded file, so the caller decides where
 * the artwork lands: a layer, or the base.
 */
export function AssetDropzone({
  label,
  multiple = true,
  onAssigned,
}: {
  label: string
  multiple?: boolean
  onAssigned: (assetId: string) => void
}) {
  const addAsset = useConfigStore((s) => s.addAsset)
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
        onAssigned(asset.id)
      } catch {
        setError(`Could not read "${file.name}".`)
      }
    }
  }

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
        <span>{label}</span>
        <input
          type="file"
          accept="image/png,image/webp,image/*"
          multiple={multiple}
          onChange={(event) => {
            void ingest(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      {error && <p className="field__hint">{error}</p>}
    </>
  )
}
