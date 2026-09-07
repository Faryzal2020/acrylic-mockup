import { create } from 'zustand'

export type RenderQuality = 'preview' | 'full'

/** ms of stillness before we go back to a full-quality render. */
const SETTLE_DELAY = 300

type RuntimeState = {
  /** 'preview' while the user is orbiting or dragging a control. */
  quality: RenderQuality
  fps: number
  /** Bumped to ask the scene to capture the next settled frame. */
  exportRequest: number
  exportScale: number
  exporting: boolean
  /** Phase 0 spike: force-render N copies of the stack to measure cost. */
  stressLayers: number
  /** Which layer the editor and the artwork picker act on. UI state, not config. */
  selectedLayerId: string | null
  /** Swap transmission for cheap transparency while interacting, for weaker GPUs. */
  lowPowerPreview: boolean

  /** Bumped to ask CameraRig to store the current framing as the saved view. */
  cameraSave: number
  /** Bumped to ask CameraRig to fly back to the saved view. */
  cameraRecall: number
  turntableRequest: number
  turntableSeconds: number
  recording: boolean
  /** 0-1 while a turntable is being captured. */
  recordProgress: number

  setFps: (fps: number) => void
  /** Used by the export path, which must capture a full-quality frame. */
  setQuality: (quality: RenderQuality) => void
  /** Call on every input tick; drops quality and re-arms the settle timer. */
  nudgeInteraction: () => void
  beginInteraction: () => void
  endInteraction: () => void

  requestExport: () => void
  setExportScale: (scale: number) => void
  setExporting: (exporting: boolean) => void
  setStressLayers: (n: number) => void
  setSelectedLayer: (id: string | null) => void
  setLowPowerPreview: (enabled: boolean) => void
  saveCamera: () => void
  recallCamera: () => void
  requestTurntable: () => void
  setTurntableSeconds: (seconds: number) => void
  setRecording: (recording: boolean) => void
  setRecordProgress: (progress: number) => void
}

let settleTimer: ReturnType<typeof setTimeout> | undefined
let held = false

export const useRuntimeStore = create<RuntimeState>((set, get) => {
  const scheduleSettle = () => {
    clearTimeout(settleTimer)
    if (held) return
    settleTimer = setTimeout(() => {
      set({ quality: 'full' })
    }, SETTLE_DELAY)
  }

  return {
    quality: 'full',
    fps: 0,
    exportRequest: 0,
    exportScale: 2,
    exporting: false,
    stressLayers: 1,
    selectedLayerId: null,
    lowPowerPreview: false,
    cameraSave: 0,
    cameraRecall: 0,
    turntableRequest: 0,
    turntableSeconds: 6,
    recording: false,
    recordProgress: 0,

    setFps: (fps) => set({ fps }),

    setQuality: (quality) => {
      clearTimeout(settleTimer)
      set({ quality })
    },

    nudgeInteraction: () => {
      if (get().quality !== 'preview') set({ quality: 'preview' })
      scheduleSettle()
    },

    beginInteraction: () => {
      held = true
      clearTimeout(settleTimer)
      if (get().quality !== 'preview') set({ quality: 'preview' })
    },

    endInteraction: () => {
      held = false
      scheduleSettle()
    },

    requestExport: () => set((s) => ({ exportRequest: s.exportRequest + 1 })),
    setExportScale: (exportScale) => set({ exportScale }),
    setExporting: (exporting) => set({ exporting }),
    setStressLayers: (stressLayers) => set({ stressLayers }),
    setSelectedLayer: (selectedLayerId) => set({ selectedLayerId }),
    setLowPowerPreview: (lowPowerPreview) => set({ lowPowerPreview }),
    saveCamera: () => set((s) => ({ cameraSave: s.cameraSave + 1 })),
    recallCamera: () => set((s) => ({ cameraRecall: s.cameraRecall + 1 })),
    requestTurntable: () => set((s) => ({ turntableRequest: s.turntableRequest + 1 })),
    setTurntableSeconds: (turntableSeconds) => set({ turntableSeconds }),
    setRecording: (recording) => set({ recording }),
    setRecordProgress: (recordProgress) => set({ recordProgress }),
  }
})
