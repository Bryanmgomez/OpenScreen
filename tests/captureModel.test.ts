import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, mergeSettings, parseStoredSettings, settingsPatchSchema } from '@shared/settings'
import {
  buildWarnings,
  isSelectionAvailable,
  mapDisplay,
  mergeSources,
  toDataUrl,
  type RawCaptureSource,
  type RawDisplay
} from '../electron/services/capture/model'

const display: RawDisplay = {
  id: 7,
  label: 'Monitor HP',
  size: { width: 1920, height: 1080 },
  scaleFactor: 1.5,
  displayFrequency: 59.94,
  rotation: 0,
  internal: false
}

function source(id: string, name: string, displayId = '7'): RawCaptureSource {
  return {
    id,
    name,
    display_id: displayId,
    thumbnail: { isEmpty: () => false, toDataURL: () => `data:image/png;base64,${id}` },
    appIcon: null
  }
}

describe('mapDisplay', () => {
  it('marca la principal y calcula resolución física según DPI', () => {
    const mapped = mapDisplay(display, 7)
    expect(mapped.primary).toBe(true)
    expect(mapped.width).toBe(1920)
    expect(mapped.height).toBe(1080)
    expect(mapped.physicalWidth).toBe(2880)
    expect(mapped.physicalHeight).toBe(1620)
    expect(mapped.refreshRate).toBeCloseTo(59.94)
  })

  it('normaliza frecuencias inválidas y escalas ausentes', () => {
    const mapped = mapDisplay({ ...display, displayFrequency: 0, scaleFactor: 0 }, 1)
    expect(mapped.refreshRate).toBeNull()
    expect(mapped.scaleFactor).toBe(1)
    expect(mapped.primary).toBe(false)
  })
})

describe('toDataUrl', () => {
  it('devuelve null para imágenes vacías y tolera fallos', () => {
    expect(toDataUrl(null)).toBeNull()
    expect(toDataUrl({ isEmpty: () => true, toDataURL: () => 'data:,' })).toBeNull()
    expect(
      toDataUrl({
        isEmpty: () => false,
        toDataURL: () => {
          throw new Error('sin permiso')
        }
      })
    ).toBeNull()
  })
})

describe('mergeSources', () => {
  it('ordena monitores primero, quita duplicados y descarta fuentes sin id', () => {
    const mapped = mergeSources(
      [source('screen:1:0', 'Pantalla 1'), source('screen:1:0', 'Duplicado'), source('', 'Vacía')],
      [source('window:42:0', 'Chrome', ''), source('window:7:0', 'Bloc de notas', '')],
      [mapDisplay(display, 7)]
    )

    expect(mapped.map((item) => item.id)).toEqual([
      'screen:1:0',
      'window:7:0',
      'window:42:0'
    ])
    expect(mapped[0]).toMatchObject({
      kind: 'screen',
      primary: true,
      width: 2880,
      height: 1620,
      refreshRate: 59.94
    })
    expect(mapped[1]).toMatchObject({ kind: 'window', width: null, iconUrl: null })
  })
})

describe('isSelectionAvailable', () => {
  const sources = mergeSources([source('screen:1:0', 'Pantalla 1')], [], [mapDisplay(display, 7)])

  it('acepta solo una referencia que coincide con una fuente real', () => {
    expect(
      isSelectionAvailable(
        { id: 'screen:1:0', kind: 'screen', name: 'Pantalla 1', displayId: '7', width: 2880, height: 1620 },
        sources
      )
    ).toBe(true)
    expect(
      isSelectionAvailable(
        { id: 'screen:1:0', kind: 'window', name: 'Pantalla 1', displayId: '7', width: null, height: null },
        sources
      )
    ).toBe(false)
    expect(isSelectionAvailable(null, sources)).toBe(false)
  })
})

describe('buildWarnings', () => {
  it('avisa de limitaciones reales de Linux y de permisos denegados', () => {
    const warnings = buildWarnings({
      platform: 'linux',
      permission: 'denied',
      displays: [mapDisplay(display, 7)],
      sources: []
    })
    expect(warnings.some((warning) => warning.includes('PipeWire'))).toBe(true)
    expect(warnings.some((warning) => warning.includes('permiso'))).toBe(true)
  })

  it('no añade avisos cuando todo está disponible en Windows', () => {
    expect(
      buildWarnings({
        platform: 'win32',
        permission: 'granted',
        displays: [mapDisplay(display, 7)],
        sources: [source('screen:1:0', 'Pantalla 1')].map((raw) => ({
          id: raw.id,
          name: raw.name,
          kind: 'screen' as const,
          displayId: '7',
          thumbnailUrl: null,
          iconUrl: null,
          width: 2880,
          height: 1620,
          primary: true,
          internal: false,
          refreshRate: 60,
          scaleFactor: 1.5
        }))
      })
    ).toEqual([])
  })
})

describe('selección persistida en ajustes', () => {
  const ref = {
    id: 'window:42:0',
    kind: 'window' as const,
    name: 'Chrome',
    displayId: '',
    width: null,
    height: null
  }

  it('acepta referencias y regiones válidas por IPC', () => {
    expect(settingsPatchSchema.safeParse({ capture: { source: ref } }).success).toBe(true)
    expect(
      settingsPatchSchema.safeParse({ capture: { region: { x: 0, y: 0, width: 800, height: 600 } } })
        .success
    ).toBe(true)
    expect(settingsPatchSchema.safeParse({ capture: { source: { id: '' } } }).success).toBe(false)
  })

  it('conserva la apariencia al cambiar la fuente y permite limpiarla con null', () => {
    const withSource = mergeSettings(DEFAULT_SETTINGS, { capture: { source: ref } })
    expect(withSource.capture.source).toEqual(ref)
    expect(withSource.appearance).toEqual(DEFAULT_SETTINGS.appearance)

    const cleared = mergeSettings(withSource, { capture: { source: null } })
    expect(cleared.capture.source).toBeNull()
    expect(cleared.capture.region).toBeNull()
  })

  it('repara una fuente corrupta leída del disco', () => {
    const loaded = parseStoredSettings({
      capture: { source: 'no-es-una-fuente', region: { x: -5, y: 0, width: 0, height: 0 } }
    })
    expect(loaded.capture).toEqual({ source: null, region: null })
  })
})
