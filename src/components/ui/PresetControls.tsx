import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { exportPreset, importPreset } from '../../lib/presets'
import { useConfigStore } from '../../store/configStore'
import { useHistoryStore } from '../../store/historyStore'
import { Button } from './controls'

export function PresetControls() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleExport = () => {
    const { config, assets } = useConfigStore.getState()
    exportPreset(
      config,
      config.layers
        .map((l) => (l.imageAssetId ? assets[l.imageAssetId]?.name : null))
        .filter((name): name is string => Boolean(name)),
    )
    setMessage(null)
  }

  const handleImport = async (file: File) => {
    const result = await importPreset(file)
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    useConfigStore.getState().replaceConfig(result.config)
    useHistoryStore.getState().clear()
    setMessage(
      result.artwork.length
        ? `Loaded. Re-upload and re-assign: ${result.artwork.join(', ')}`
        : 'Loaded.',
    )
  }

  return (
    <>
      <div className="row">
        <Button block onClick={handleExport}>
          <Download size={14} aria-hidden />
          Save preset
        </Button>
        <Button block onClick={() => inputRef.current?.click()}>
          <Upload size={14} aria-hidden />
          Load preset
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImport(file)
          event.target.value = ''
        }}
      />

      {message && <p className="field__hint">{message}</p>}

      <p className="field__hint">
        A preset stores the whole configuration as JSON. It cannot store your PNGs — there is
        no server behind this — so keep the source files next to the preset and re-assign them
        to their layers after loading.
      </p>
    </>
  )
}
