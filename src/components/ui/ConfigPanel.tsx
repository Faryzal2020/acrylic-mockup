import { useConfigStore } from '../../store/configStore'
import { ArtworkControls } from './ArtworkControls'
import { BackgroundControls } from './BackgroundControls'
import { BaseControls } from './BaseControls'
import { LayerList } from './LayerList'
import { LineControls } from './LineControls'
import { CameraLightingControls } from './CameraLightingControls'
import { ExportControls } from './ExportControls'
import { MaterialControls } from './MaterialControls'
import { PanelControls } from './PanelControls'
import { PerformancePanel } from './PerformancePanel'
import { PresetControls } from './PresetControls'
import { ProductTypeSelector } from './ProductTypeSelector'
import { TurntableControls } from './TurntableControls'
import { Section } from './controls'

function LayerCount() {
  const count = useConfigStore((s) => s.config.layers.length)
  return <>{count}</>
}

export function ConfigPanel({ viewport }: { viewport: { width: number; height: number } }) {
  return (
    <div>
      <Section title="Product">
        <ProductTypeSelector />
      </Section>

      <Section title="Artwork">
        <ArtworkControls />
      </Section>

      <Section title="Panel">
        <PanelControls />
      </Section>

      <Section title="Layers" badge={<LayerCount />}>
        <LayerList />
      </Section>

      <Section title="Base">
        <BaseControls />
      </Section>

      <Section title="Material">
        <MaterialControls />
      </Section>

      <Section title="Lines">
        <LineControls />
      </Section>

      <Section title="Camera & lighting">
        <CameraLightingControls />
      </Section>

      <Section title="Background">
        <BackgroundControls />
      </Section>

      <Section title="Export">
        <ExportControls viewport={viewport} />
      </Section>

      <Section title="Turntable" defaultOpen={false}>
        <TurntableControls />
      </Section>

      <Section title="Presets" defaultOpen={false}>
        <PresetControls />
      </Section>

      <Section title="Performance" defaultOpen={false}>
        <PerformancePanel />
      </Section>
    </div>
  )
}
