import { describe, expect, it } from 'vitest'
import { filterAndSortRecordings, type RecordingFile } from '@shared/recording'

const NOW = new Date(2026, 10, 21, 12, 0, 0).getTime()
const day = 86_400_000

function file(
  name: string,
  overrides: Partial<RecordingFile> = {}
): RecordingFile {
  return {
    path: `C:/Videos/${name}`,
    name,
    size: 1000,
    mimeType: 'video/webm',
    format: 'webm',
    durationMs: 10_000,
    createdAt: NOW,
    tracks: [],
    metadataStatus: 'ok',
    codec: 'vp9',
    actualWidth: 1280,
    actualHeight: 720,
    actualFps: 30,
    measuredFps: 29.8,
    encoding: null,
    ...overrides
  }
}

const items: RecordingFile[] = [
  file('Alpha.webm', { durationMs: 20_000, size: 500, createdAt: NOW - 2 * day }),
  file('beta.mp4', { format: 'mp4', durationMs: 5_000, size: 3000, createdAt: NOW - 10 * day }),
  file('Gamma.webm', { durationMs: null, size: 9000, createdAt: NOW - 60 * day })
]

describe('filterAndSortRecordings', () => {
  it('filtra por texto, formato y periodo usando solo datos reales', () => {
    expect(
      filterAndSortRecordings(items, {
        query: 'ALPHA',
        format: 'all',
        period: 'all',
        sort: 'date',
        direction: 'desc'
      }, NOW).map((item) => item.name)
    ).toEqual(['Alpha.webm'])

    expect(
      filterAndSortRecordings(items, {
        query: '',
        format: 'mp4',
        period: 'all',
        sort: 'date',
        direction: 'desc'
      }, NOW).map((item) => item.name)
    ).toEqual(['beta.mp4'])

    expect(
      filterAndSortRecordings(items, {
        query: '',
        format: 'all',
        period: '7d',
        sort: 'date',
        direction: 'desc'
      }, NOW).map((item) => item.name)
    ).toEqual(['Alpha.webm'])
  })

  it('ordena por fecha, nombre, duración y tamaño en ambas direcciones', () => {
    const base = { query: '', format: 'all' as const, period: 'all' as const }
    expect(
      filterAndSortRecordings(items, { ...base, sort: 'name', direction: 'asc' }, NOW).map(
        (item) => item.name
      )
    ).toEqual(['Alpha.webm', 'beta.mp4', 'Gamma.webm'])
    expect(
      filterAndSortRecordings(items, { ...base, sort: 'date', direction: 'asc' }, NOW).map(
        (item) => item.name
      )
    ).toEqual(['Gamma.webm', 'beta.mp4', 'Alpha.webm'])
    expect(
      filterAndSortRecordings(items, { ...base, sort: 'size', direction: 'desc' }, NOW).map(
        (item) => item.name
      )
    ).toEqual(['Gamma.webm', 'beta.mp4', 'Alpha.webm'])
  })

  it('deja los valores desconocidos al final aunque el orden sea descendente', () => {
    const result = filterAndSortRecordings(
      items,
      { query: '', format: 'all', period: 'all', sort: 'duration', direction: 'desc' },
      NOW
    )
    expect(result.map((item) => item.name)).toEqual(['Alpha.webm', 'beta.mp4', 'Gamma.webm'])
    expect(result[2]?.durationMs).toBeNull()
  })
})
