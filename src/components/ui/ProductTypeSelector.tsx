import { useConfigStore } from '../../store/configStore'
import type { HardwareType, ProductType } from '../../types/config'
import { SegmentedControl, Slider } from './controls'

export function ProductTypeSelector() {
  const productType = useConfigStore((s) => s.config.productType)
  const hardware = useConfigStore((s) => s.config.hardware)
  const setProductType = useConfigStore((s) => s.setProductType)
  const patchSection = useConfigStore((s) => s.patchSection)

  return (
    <>
      <SegmentedControl<ProductType>
        value={productType}
        options={[
          { value: 'standee', label: 'Standee' },
          { value: 'keychain', label: 'Keychain' },
          { value: 'phoneGrip', label: 'Grip' },
          { value: 'badge', label: 'Badge' },
        ]}
        onChange={setProductType}
      />

      <p className="field__hint">
        Switching resets size, base and hardware to suit the product. Layers, artwork,
        material and lighting are kept.
      </p>

      <SegmentedControl<HardwareType>
        label="Hardware"
        value={hardware.type}
        options={[
          { value: 'none', label: 'None' },
          { value: 'keyring', label: 'Keyring' },
          { value: 'popSocket', label: 'Pop socket' },
        ]}
        onChange={(type) => patchSection('hardware', { type })}
      />

      {hardware.type !== 'none' && (
        <>
          <div className="row">
            <Slider
              label="Across"
              value={hardware.position.x}
              min={0.05}
              max={0.95}
              step={0.01}
              precision={2}
              onChange={(x) =>
                patchSection('hardware', { position: { ...hardware.position, x } })
              }
            />
            <Slider
              label="Up"
              value={hardware.position.y}
              min={0.05}
              max={0.95}
              step={0.01}
              precision={2}
              onChange={(y) =>
                patchSection('hardware', { position: { ...hardware.position, y } })
              }
            />
          </div>

          {hardware.type === 'keyring' && (
            <Slider
              label="Hole diameter"
              value={hardware.holeDiameter}
              min={2}
              max={12}
              step={0.5}
              precision={1}
              unit=" mm"
              hint="Cut through every layer in the stack."
              onChange={(holeDiameter) => patchSection('hardware', { holeDiameter })}
            />
          )}
        </>
      )}
    </>
  )
}
