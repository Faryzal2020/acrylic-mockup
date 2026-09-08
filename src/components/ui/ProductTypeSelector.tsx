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
          { value: 'magnet', label: 'Magnet' },
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
          { value: 'magnet', label: 'Magnet' },
        ]}
        onChange={(type) => patchSection('hardware', { type })}
      />

      {hardware.type === 'magnet' && (
        <Slider
          label="Magnet thickness"
          value={hardware.magnetThickness}
          min={0.5}
          max={6}
          step={0.5}
          precision={1}
          unit=" mm"
          hint="An opaque sheet bonded behind the stack, cut to the same outline as the back layer."
          onChange={(magnetThickness) => patchSection('hardware', { magnetThickness })}
        />
      )}

      {hardware.type === 'keyring' && (
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

          {(
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
