import { app } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import type { AppInfo, PlatformName } from '../../../shared/api'
import { handle } from './register'

function platformName(): PlatformName {
  switch (process.platform) {
    case 'win32':
    case 'darwin':
    case 'linux':
      return process.platform
    default:
      return 'other'
  }
}

export function registerAppHandlers(): void {
  handle(IPC_CHANNELS.app.getInfo, z.undefined(), (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: platformName(),
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged
  }))
}
