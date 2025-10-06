import type { CameraPose } from '../../types'

type Listener = (pose: CameraPose, sourceId: string) => void

export class CameraBus {
  private listeners: Set<Listener> = new Set()
  private _driverId: string | null = null
  private _latest?: CameraPose

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    if (this._latest) {
      // Send latest pose to new subscribers (non-driver panes should apply it)
      queueMicrotask(() => fn(this._latest!, this._driverId ?? ''))
    }
    return () => this.listeners.delete(fn)
  }

  get driverId() { return this._driverId }
  set driverId(id: string | null) { this._driverId = id }

  emit(pose: CameraPose, sourceId: string) {
    this._latest = pose
    for (const l of this.listeners) l(pose, sourceId)
  }
}

export const cameraBus = new CameraBus()

