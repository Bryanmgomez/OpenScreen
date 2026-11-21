import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  parseStoredSettings,
  type Settings,
  type SettingsPatch
} from '../../../shared/settings'

type Listener = (settings: Settings) => void

/**
 * Persistencia de ajustes en un archivo JSON.
 *
 * - No depende de Electron: recibe la ruta del archivo, lo que permite probarlo de forma aislada.
 * - Las escrituras son atómicas (archivo temporal + rename) y se serializan para que dos
 *   actualizaciones seguidas no se pisen.
 */
export class SettingsService {
  private current: Settings = DEFAULT_SETTINGS
  private writeQueue: Promise<void> = Promise.resolve()
  private readonly listeners = new Set<Listener>()

  constructor(private readonly filePath: string) {}

  /** Lee el archivo de disco. Si no existe o está corrupto usa los valores por defecto. */
  async load(): Promise<Settings> {
    try {
      const text = await fs.readFile(this.filePath, 'utf8')
      this.current = parseStoredSettings(JSON.parse(text) as unknown)
    } catch {
      this.current = DEFAULT_SETTINGS
    }
    return this.current
  }

  get(): Settings {
    return this.current
  }

  async update(patch: SettingsPatch): Promise<Settings> {
    this.current = mergeSettings(this.current, patch)
    const snapshot = this.current
    await this.persist(snapshot)
    for (const listener of this.listeners) listener(snapshot)
    return snapshot
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private persist(settings: Settings): Promise<void> {
    const task = this.writeQueue.then(async () => {
      await fs.mkdir(dirname(this.filePath), { recursive: true })
      const tmpPath = `${this.filePath}.tmp`
      await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), 'utf8')
      await fs.rename(tmpPath, this.filePath)
    })
    // La cola nunca debe quedar rechazada: un fallo no puede bloquear escrituras posteriores.
    this.writeQueue = task.catch(() => undefined)
    return task
  }
}
