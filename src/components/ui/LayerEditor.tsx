import { useConfigStore } from '../../store/configStore'
import type { AcrylicLayer, ImageMode } from '../../types/config'
import { Button, Field, SegmentedControl, Slider } from './controls'

export function LayerEditor({ layer, index }: { layer: AcrylicLayer; index: number }) {
  const assets = useConfigStore((s) => s.assets)
  const patchLayer = useConfigStore((s) => s.patchLayer)
  const traced = useConfigStore((s) => s.config.panel.shape === 'traceFromAlpha')

  const assetList = Object.values(assets)

  const patchPlacement = (patch: Partial<AcrylicLayer['imagePlacement']>) =>
    patchLayer(layer.id, { imagePlacement: { ...layer.imagePlacement, ...patch } })

  return (
    <>
      <Field
        label="Artwork"
        hint={
          assetList.length === 0
            ? 'Upload a PNG in the Artwork section first.'
            : undefined
        }
      >
        <div className="chip-row">
          <button
            type="button"
            className={`chip${layer.imageAssetId === null ? ' chip--active' : ''}`}
            onClick={() => patchLayer(layer.id, { imageAssetId: null })}
          >
            None
          </button>
          {assetList.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className={`chip${layer.imageAssetId === asset.id ? ' chip--active' : ''}`}
              title={asset.name}
              onClick={() => patchLayer(layer.id, { imageAssetId: asset.id })}
            >
              <img className="chip__thumb" src={asset.url} alt="" />
              <span className="chip__label">{asset.name}</span>
            </button>
          ))}
        </div>
      </Field>

      <Slider
        label="Thickness"
        value={layer.thickness}
        min={1}
        max={12}
        step={0.5}
        precision={1}
        unit=" mm"
        onChange={(thickness) => patchLayer(layer.id, { thickness })}
      />

      <Slider
        label="Gap behind"
        value={layer.gapBefore}
        min={0}
        max={20}
        step={0.5}
        precision={1}
        unit=" mm"
        disabled={index === 0}
        hint={
          index === 0
            ? 'The backmost layer has nothing to be spaced from.'
            : 'Air gap between this layer and the one behind it — this is what reads as depth.'
        }
        onChange={(gapBefore) => patchLayer(layer.id, { gapBefore })}
      />

      <SegmentedControl<ImageMode>
        label="Print position"
        value={layer.imageMode}
        options={[
          { value: 'surfacePrint', label: 'On surface' },
          { value: 'sandwiched', label: 'Sandwiched' },
        ]}
        hint="Sandwiched floats the art inside the slab, so you look at it through the acrylic."
        onChange={(imageMode) => patchLayer(layer.id, { imageMode })}
      />

      <Slider
        label="Scale"
        value={layer.imagePlacement.scale}
        min={0.2}
        max={2}
        step={0.01}
        precision={2}
        unit="×"
        hint={traced ? 'Scales the cut and the print together.' : undefined}
        onChange={(scale) => patchPlacement({ scale })}
      />

      <div className="row">
        <Slider
          label="Offset X"
          value={layer.imagePlacement.x}
          min={-0.5}
          max={0.5}
          step={0.005}
          precision={3}
          onChange={(x) => patchPlacement({ x })}
        />
        <Slider
          label="Offset Y"
          value={layer.imagePlacement.y}
          min={-0.5}
          max={0.5}
          step={0.005}
          precision={3}
          onChange={(y) => patchPlacement({ y })}
        />
      </div>

      <Slider
        label="Rotation"
        value={layer.imagePlacement.rotation}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(rotation) => patchPlacement({ rotation })}
      />

      <Button
        block
        onClick={() =>
          patchPlacement({ x: 0, y: 0, scale: 1, rotation: 0 })
        }
      >
        Reset placement
      </Button>
    </>
  )
}
