import type {
  CapturePlatform,
  CaptureSource,
  CaptureSourceKind,
  DisplayInfo,
  MediaAccessStatus,
  SourceRef
} from '../../../shared/capture'

/**
 * Funciones puras de mapeo entre las APIs de Electron y el contrato compartido.
 * No importan `electron`: así pueden probarse en Node con vitest.
 */

/** Subconjunto de `NativeImage` que necesitamos para convertir miniaturas en data URLs. */
export interface ImageLike {
  isEmpty(): boolean
  toDataURL(): string
}

/** Subconjunto de `DesktopCapturerSource` que consumimos. */
export interface RawCaptureSource {
  id: string
  name: string
  display_id: string
  thumbnail: ImageLike | null
  appIcon: ImageLike | null
}

/** Subconjunto de `screen.Display` que consumimos. */
export interface RawDisplay {
  id: number
  label: string
  size: { width: number; height: number }
  scaleFactor: number
  displayFrequency: number
  rotation: number
  internal: boolean
}

/** Convierte una imagen nativa a data URL, tolerando imágenes vacías o fallidas. */
export function toDataUrl(image: ImageLike | null | undefined): string | null {
  if (!image) return null
  try {
    return image.isEmpty() ? null : image.toDataURL()
  } catch {
    return null
  }
}

function positiveOrNull(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/** Mapea un `Display` real. La resolución física tiene en cuenta el factor de escala/DPI. */
export function mapDisplay(raw: RawDisplay, primaryId: number): DisplayInfo {
  const width = Math.max(1, Math.round(raw.size.width))
  const height = Math.max(1, Math.round(raw.size.height))
  const scaleFactor = positiveOrNull(raw.scaleFactor) ?? 1

  return {
    id: raw.id,
    label: raw.label || `Pantalla ${raw.id}`,
    primary: raw.id === primaryId,
    internal: Boolean(raw.internal),
    width,
    height,
    physicalWidth: Math.round(width * scaleFactor),
    physicalHeight: Math.round(height * scaleFactor),
    scaleFactor,
    refreshRate: positiveOrNull(raw.displayFrequency),
    rotation: raw.rotation
  }
}

/**
 * Mapea una fuente real descartando las que no tengan id/nombre (ventanas protegidas
 * o fuentes que desaparecieron mientras se enumeraban).
 */
export function mapSource(
  raw: RawCaptureSource,
  kind: CaptureSourceKind,
  displays: readonly DisplayInfo[]
): CaptureSource | null {
  const id = raw.id?.trim()
  const name = raw.name?.trim()
  if (!id || !name) return null

  const displayId = raw.display_id ?? ''
  const display = displays.find((item) => String(item.id) === displayId)

  return {
    id,
    name,
    kind,
    displayId,
    thumbnailUrl: toDataUrl(raw.thumbnail),
    iconUrl: kind === 'window' ? toDataUrl(raw.appIcon) : null,
    // El id de una ventana no expone sus bounds; solo los monitores tienen resolución real.
    width: kind === 'screen' ? (display?.physicalWidth ?? null) : null,
    height: kind === 'screen' ? (display?.physicalHeight ?? null) : null,
    primary: kind === 'screen' ? Boolean(display?.primary) : false,
    internal: kind === 'screen' ? Boolean(display?.internal) : false,
    refreshRate: kind === 'screen' ? (display?.refreshRate ?? null) : null,
    scaleFactor: kind === 'screen' ? (display?.scaleFactor ?? null) : null
  }
}

/** Combina pantallas y ventanas en una sola lista estable, sin duplicados por id. */
export function mergeSources(
  screenSources: readonly RawCaptureSource[],
  windowSources: readonly RawCaptureSource[],
  displays: readonly DisplayInfo[]
): CaptureSource[] {
  const seen = new Set<string>()
  const result: CaptureSource[] = []

  for (const [kind, rawSources] of [
    ['screen', screenSources],
    ['window', windowSources]
  ] as const) {
    for (const raw of rawSources) {
      const mapped = mapSource(raw, kind, displays)
      if (!mapped || seen.has(mapped.id)) continue
      seen.add(mapped.id)
      result.push(mapped)
    }
  }

  return result.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'screen' ? -1 : 1
    if (a.kind === 'screen' && a.primary !== b.primary) return a.primary ? -1 : 1
    return a.name.localeCompare(b.name, 'es')
  })
}

/** Una referencia guardada solo es válida si sigue coincidiendo con una fuente real. */
export function isSelectionAvailable(
  selection: SourceRef | null,
  sources: readonly CaptureSource[]
): boolean {
  if (!selection) return false
  return sources.some((source) => source.id === selection.id && source.kind === selection.kind)
}

/** Avisos honestos sobre limitaciones reales de cada plataforma. */
export function buildWarnings(options: {
  platform: CapturePlatform
  permission: MediaAccessStatus
  displays: readonly DisplayInfo[]
  sources: readonly CaptureSource[]
}): string[] {
  const warnings: string[] = []

  if (options.permission === 'denied' || options.permission === 'restricted') {
    warnings.push('El sistema denegó el permiso de captura. Habilítalo en la configuración del sistema.')
  } else if (options.permission === 'not-determined' && options.platform === 'darwin') {
    warnings.push('macOS pedirá permiso para grabar la pantalla la primera vez que se use.')
  }

  if (options.platform === 'linux') {
    warnings.push('En Linux con PipeWire puede mostrarse una sola fuente y ventanas/pantallas pueden combinarse.')
  }

  if (options.platform === 'darwin') {
    warnings.push('En macOS las ventanas protegidas pueden aparecer sin miniatura o no aparecer.')
  }

  if (options.displays.length === 0) {
    warnings.push('No se detectaron monitores. Revisa la configuración de pantalla del sistema.')
  }

  if (options.sources.length === 0 && options.permission !== 'denied') {
    warnings.push('No hay fuentes disponibles en este momento. Pulsa «Actualizar» para volver a buscar.')
  }

  return warnings
}
