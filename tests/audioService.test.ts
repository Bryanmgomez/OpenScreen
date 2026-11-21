import { afterEach, describe, expect, it, vi } from 'vitest'

const getMediaAccessStatus = vi.fn((..._args: unknown[]) => 'granted')
vi.mock('electron', () => ({
  systemPreferences: {
    getMediaAccessStatus: (...args: unknown[]) => getMediaAccessStatus(...args)
  }
}))

import { AudioService } from '../electron/services/audio/audioService'

const realPlatform = process.platform

function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true })
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true })
  getMediaAccessStatus.mockClear()
  getMediaAccessStatus.mockReturnValue('granted')
})

describe('AudioService', () => {
  it('declara Windows compatible porque el loopback se verificó con audio real', () => {
    setPlatform('win32')
    const support = new AudioService().getSupport()
    expect(support.platform).toBe('win32')
    expect(support.systemAudio).toBe('available')
    expect(support.systemMethod).toBe('electron-loopback')
    expect(support.microphonePermission).toBe('granted')
    expect(support.notes.join(' ')).toMatch(/verificada/i)
  })

  it('no presenta el loopback como compatible en macOS ni Linux', () => {
    setPlatform('darwin')
    const mac = new AudioService().getSupport()
    expect(mac.systemAudio).toBe('unavailable')
    expect(mac.systemMethod).toBe('none')

    // macOS sí consulta el permiso de micrófono; Linux no tiene esa API.
    expect(getMediaAccessStatus).toHaveBeenCalledWith('microphone')
    getMediaAccessStatus.mockClear()

    setPlatform('linux')
    const linux = new AudioService().getSupport()
    expect(linux.systemAudio).toBe('unavailable')
    expect(linux.systemMethod).toBe('none')
    expect(linux.microphonePermission).toBe('unsupported')
    expect(getMediaAccessStatus).not.toHaveBeenCalled()
  })
})
