import { desktopCapturer, screen, systemPreferences, type DesktopCapturerSource } from 'electron'
import {
  MEDIA_ACCESS_STATUSES,
  type CapturePlatform,
  type CaptureRegion,
  type CaptureSnapshot,
  type MediaAccessStatus,
  type SourceRef
} from '../../../shared/capture'
import type { SettingsService } from '../settings/settingsService'
import { buildWarnings, isSelectionAvailable, mapDisplay, mergeSources } from './model'

const THUMBNAIL_SIZE = { width: 240, height: 150 }
/** Electron no emite eventos cuando se abre o cierra una ventana: hay que sondear. */
const WINDOW_POLL_MS = 5000

function resolvePlatform(value: string): CapturePlatform {
  return value === 'win32' || value === 'darwin' || value === 'linux' ? value : 'other'
}

function signatureOf(snapshot: CaptureSnapshot): string {
  return JSON.stringify(
    snapshot.sources.map((source) => [source.id, source.name, source.thumbnailUrl?.length ?? 0])
  )
}

/**
 * Servicio de detección de fuentes. Vive en main porque `desktopCapturer`, `screen` y
 * `systemPreferences` solo están disponibles ahí. Toda la lógica de mapeo está en `model.ts`.
 */
export class CaptureService {
  private readonly platform: CapturePlatform
  private readonly listeners = new Set<(snapshot: CaptureSnapshot) => void>()
  private inFlight: Promise<CaptureSnapshot> | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private lastSignature = ''

  constructor(private readonly settings: SettingsService) {
    this.platform = resolvePlatform(process.platform)
  }

  /** Construye una instantánea real. Concurrente-safe: comparte la petición en curso. */
  getSnapshot(): Promise<CaptureSnapshot> {
    if (!this.inFlight) {
      this.inFlight = this.buildSnapshot().finally(() => {
        this.inFlight = null
      })
    }
    return this.inFlight
  }

  private async buildSnapshot(): Promise<CaptureSnapshot> {
    const primaryId = screen.getPrimaryDisplay().id
    const displays = screen.getAllDisplays().map((display) => mapDisplay(display, primaryId))

    let screenSources: Awaited<ReturnType<typeof desktopCapturer.getSources>> = []
    let windowSources: Awaited<ReturnType<typeof desktopCapturer.getSources>> = []
    const captureWarnings: string[] = []

    try {
      ;[screenSources, windowSources] = await Promise.all([
        desktopCapturer.getSources({ types: ['screen'], thumbnailSize: THUMBNAIL_SIZE }),
        desktopCapturer.getSources({
          types: ['window'],
          thumbnailSize: THUMBNAIL_SIZE,
          fetchWindowIcons: true
        })
      ])
    } catch (error) {
      captureWarnings.push(
        `No se pudieron enumerar las fuentes: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }

    const sources = mergeSources(screenSources, windowSources, displays)
    const stored = this.settings.get().capture
    const permission = this.getPermission()

    return {
      displays,
      sources,
      selection: stored.source,
      selectionAvailable: isSelectionAvailable(stored.source, sources),
      region: stored.region,
      permission,
      platform: this.platform,
      warnings: [
        ...captureWarnings,
        ...buildWarnings({ platform: this.platform, permission, displays, sources })
      ],
      generatedAt: Date.now()
    }
  }

  private getPermission(): MediaAccessStatus {
    // getMediaAccessStatus('screen') solo está documentado en Windows y macOS.
    if (this.platform !== 'win32' && this.platform !== 'darwin') return 'unsupported'
    try {
      const status = systemPreferences.getMediaAccessStatus('screen')
      return MEDIA_ACCESS_STATUSES.includes(status as MediaAccessStatus)
        ? (status as MediaAccessStatus)
        : 'unknown'
    } catch {
      return 'unknown'
    }
  }

  /** Persiste la referencia elegida y devuelve la instantánea ya revalidada. */
  async selectSource(ref: SourceRef): Promise<CaptureSnapshot> {
    await this.settings.update({ capture: { source: ref } })
    return this.refresh()
  }

  async setRegion(region: CaptureRegion): Promise<CaptureSnapshot> {
    await this.settings.update({ capture: { region } })
    return this.refresh()
  }

  async clearSelection(): Promise<CaptureSnapshot> {
    await this.settings.update({ capture: { source: null } })
    return this.refresh()
  }

  onSourcesChange(listener: (snapshot: CaptureSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Eventos de monitor + sondeo de ventanas; solo emite cuando la lista cambia. */
  startWatching(): void {
    if (this.timer) return
    screen.on('display-added', this.onDisplayChange)
    screen.on('display-removed', this.onDisplayChange)
    screen.on('display-metrics-changed', this.onDisplayChange)
    this.timer = setInterval(() => {
      void this.refreshIfChanged()
    }, WINDOW_POLL_MS)
  }

  stopWatching(): void {
    screen.off('display-added', this.onDisplayChange)
    screen.off('display-removed', this.onDisplayChange)
    screen.off('display-metrics-changed', this.onDisplayChange)
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private readonly onDisplayChange = (): void => {
    void this.refresh()
  }

  private async refreshIfChanged(): Promise<void> {
    try {
      const snapshot = await this.getSnapshot()
      if (signatureOf(snapshot) === this.lastSignature) return
      this.emit(snapshot)
    } catch {
      // Un sondeo fallido no debe interrumpir la interfaz; el siguiente intento lo corrige.
    }
  }

  private async refresh(): Promise<CaptureSnapshot> {
    const snapshot = await this.getSnapshot()
    this.emit(snapshot)
    return snapshot
  }

  private emit(snapshot: CaptureSnapshot): void {
    this.lastSignature = signatureOf(snapshot)
    for (const listener of this.listeners) listener(snapshot)
  }

  /**
   * Resuelve la fuente seleccionada para `setDisplayMediaRequestHandler`.
   * Se vuelve a enumerar porque el id guardado puede haber caducado.
   */
  async resolveSelectedSource(): Promise<DesktopCapturerSource | null> {
    const ref = this.settings.get().capture.source
    if (!ref) return null
    const sources = await desktopCapturer.getSources({
      types: [ref.kind],
      thumbnailSize: { width: 0, height: 0 }
    })
    return sources.find((source) => source.id === ref.id) ?? null
  }
}
