import { useConfigStore } from '../../store/configStore'

/** Picks one of the session's uploaded PNGs, or none. */
export function AssetPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (assetId: string | null) => void
}) {
  const assets = useConfigStore((s) => s.assets)
  const list = Object.values(assets)

  return (
    <div className="chip-row">
      <button
        type="button"
        className={`chip${value === null ? ' chip--active' : ''}`}
        onClick={() => onChange(null)}
      >
        None
      </button>
      {list.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className={`chip${value === asset.id ? ' chip--active' : ''}`}
          title={asset.name}
          onClick={() => onChange(asset.id)}
        >
          <img className="chip__thumb" src={asset.url} alt="" />
          <span className="chip__label">{asset.name}</span>
        </button>
      ))}
    </div>
  )
}
