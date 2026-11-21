/** Formatea milisegundos como m:ss o h:mm:ss. Los datos desconocidos no se inventan. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—'
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Fecha corta en español, p. ej. «21 nov 2026, 14:05». */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return 'Desconocido'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export function formatResolution(width: number | null, height: number | null): string {
  if (!width || !height) return 'Desconocida'
  return `${width}×${height}`
}

/** Distingue la cadencia informada por la fuente de la realmente medida. */
export function formatFps(actual: number | null, measured: number | null): string {
  const round = (value: number): number => Math.round(value * 10) / 10
  if (actual !== null && Number.isFinite(actual)) {
    const applied = `${round(actual)} fps`
    if (measured !== null && Number.isFinite(measured) && Math.abs(measured - actual) >= 0.05) {
      return `${applied} (${round(measured)} medidos)`
    }
    return applied
  }
  if (measured !== null && Number.isFinite(measured)) {
    return `${round(measured)} fps (medidos)`
  }
  return 'Desconocido'
}
