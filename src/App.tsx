import { Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SceneCanvas } from './components/scene/SceneCanvas'
import { setOverlayCanvas } from './lib/transparentComposite'
import { ConfigPanel } from './components/ui/ConfigPanel'
import { Button } from './components/ui/controls'
import { useConfigStore } from './store/configStore'
import { useHistoryStore } from './store/historyStore'
import { useRuntimeStore } from './store/runtimeStore'

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  const hasArtwork = useConfigStore((s) => Object.keys(s.assets).length > 0)
  const transparentBackground = useConfigStore((s) => s.config.background.mode === 'transparent')
  const resetConfig = useConfigStore((s) => s.resetConfig)
  const fps = useRuntimeStore((s) => s.fps)
  const quality = useRuntimeStore((s) => s.quality)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      if (!modifier || event.key.toLowerCase() !== 'z') return
      // Never hijack undo inside a text field.
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return
      event.preventDefault()
      if (event.shiftKey) useHistoryStore.getState().redo()
      else useHistoryStore.getState().undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          Acrylic Mockup
          <span className="app__subtitle">standee · keychain · magnet · badge</span>
        </h1>

        <div className="readout">
          <span className="readout__item">
            <span>{viewport.width}×{viewport.height}</span>
          </span>
          <span className="readout__item">
            <span className="readout__value">{String(fps).padStart(2, '0')}</span>
            <span>fps</span>
          </span>
          <span className={`readout__badge readout__badge--${quality}`}>{quality}</span>
          <Button onClick={undo} disabled={!canUndo} aria-label="Undo">
            <Undo2 size={13} aria-hidden />
          </Button>
          <Button onClick={redo} disabled={!canRedo} aria-label="Redo">
            <Redo2 size={13} aria-hidden />
          </Button>
          <Button onClick={resetConfig} aria-label="Reset configuration">
            <RotateCcw size={13} aria-hidden />
            Reset
          </Button>
        </div>
      </header>

      <div
        className={`app__viewport${transparentBackground ? ' app__viewport--transparent' : ''}`}
        ref={viewportRef}
      >
        <SceneCanvas />
        {/*
          Receives the settled transparent-background composite. Sits above the
          WebGL canvas but never takes the pointer, so orbiting still works.
        */}
        <canvas className="viewport__overlay" ref={setOverlayCanvas} />
        {!hasArtwork && (
          <div className="viewport__empty">
            <span>Upload a transparent PNG to see it on the panel.</span>
            <span>Drag in the viewport to orbit.</span>
          </div>
        )}
      </div>

      <aside className="app__sidebar">
        <ConfigPanel viewport={viewport} />
      </aside>
    </div>
  )
}
