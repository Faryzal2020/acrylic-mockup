import { create } from 'zustand'
import { useConfigStore } from './configStore'
import type { MockupConfig } from '../types/config'

/** Rapid changes (a slider drag) collapse into one entry after this quiet gap. */
const COALESCE_MS = 450
const LIMIT = 60

type HistoryState = {
  past: MockupConfig[]
  future: MockupConfig[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  clear: () => void
}

/**
 * Undo/redo over the config object.
 *
 * Snapshots are taken by subscribing to the config store rather than by
 * wrapping every action, so nothing has to remember to record itself — and
 * because the whole of "what you see" is one serializable object, a snapshot
 * is just a reference to the previous value.
 */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  undo: () => {
    const { past } = get()
    if (!past.length) return
    const previous = past[past.length - 1]
    const current = useConfigStore.getState().config

    applySilently(previous)
    set((s) => ({
      past: s.past.slice(0, -1),
      future: [current, ...s.future].slice(0, LIMIT),
      canUndo: s.past.length > 1,
      canRedo: true,
    }))
  },

  redo: () => {
    const { future } = get()
    if (!future.length) return
    const next = future[0]
    const current = useConfigStore.getState().config

    applySilently(next)
    set((s) => ({
      past: [...s.past, current].slice(-LIMIT),
      future: s.future.slice(1),
      canUndo: true,
      canRedo: s.future.length > 1,
    }))
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}))

/** True while undo/redo is writing, so the subscription does not re-record it. */
let restoring = false

function applySilently(config: MockupConfig) {
  restoring = true
  useConfigStore.getState().replaceConfig(config)
  restoring = false
}

let pending: MockupConfig | null = null
let timer: ReturnType<typeof setTimeout> | undefined

useConfigStore.subscribe((state, previous) => {
  if (restoring || state.config === previous.config) return

  // Hold the value from *before* the burst started, so a whole slider drag
  // undoes in one step rather than one step per pixel.
  if (pending === null) pending = previous.config

  clearTimeout(timer)
  timer = setTimeout(() => {
    const snapshot = pending
    pending = null
    if (!snapshot) return
    useHistoryStore.setState((s) => ({
      past: [...s.past, snapshot].slice(-LIMIT),
      future: [],
      canUndo: true,
      canRedo: false,
    }))
  }, COALESCE_MS)
})
