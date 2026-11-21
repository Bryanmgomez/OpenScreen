import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsService } from '../electron/services/settings/settingsService'
import { DEFAULT_SETTINGS } from '@shared/settings'

let dir: string
let filePath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'openscreen-test-'))
  filePath = join(dir, 'nested', 'settings.json')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('SettingsService', () => {
  it('usa los valores por defecto si el archivo no existe', async () => {
    const service = new SettingsService(filePath)
    expect(await service.load()).toEqual(DEFAULT_SETTINGS)
  })

  it('usa los valores por defecto si el archivo está corrupto', async () => {
    await writeFile(join(dir, 'corrupt.json'), '{ esto no es json', 'utf8')
    const service = new SettingsService(join(dir, 'corrupt.json'))
    expect(await service.load()).toEqual(DEFAULT_SETTINGS)
  })

  it('persiste los cambios y los recupera al volver a cargar', async () => {
    const first = new SettingsService(filePath)
    await first.load()
    await first.update({ appearance: { theme: 'light', reduceMotion: true } })

    const second = new SettingsService(filePath)
    const loaded = await second.load()
    expect(loaded.appearance).toEqual({ theme: 'light', reduceMotion: true })
  })

  it('crea la carpeta de destino si no existe y no deja archivos temporales', async () => {
    const service = new SettingsService(filePath)
    await service.update({ appearance: { theme: 'system' } })
    const text = await readFile(filePath, 'utf8')
    expect(JSON.parse(text).appearance.theme).toBe('system')
    await expect(readFile(`${filePath}.tmp`, 'utf8')).rejects.toThrow()
  })

  it('serializa actualizaciones simultáneas sin perder ninguna', async () => {
    const service = new SettingsService(filePath)
    await Promise.all([
      service.update({ appearance: { theme: 'light' } }),
      service.update({ appearance: { reduceMotion: true } })
    ])
    const loaded = await new SettingsService(filePath).load()
    expect(loaded.appearance).toEqual({ theme: 'light', reduceMotion: true })
  })

  it('notifica a los suscriptores y permite cancelar la suscripción', async () => {
    const service = new SettingsService(filePath)
    const listener = vi.fn()
    const unsubscribe = service.onChange(listener)

    await service.update({ appearance: { theme: 'light' } })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]?.[0].appearance.theme).toBe('light')

    unsubscribe()
    await service.update({ appearance: { theme: 'dark' } })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
