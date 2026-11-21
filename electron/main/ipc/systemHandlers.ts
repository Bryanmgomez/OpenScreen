import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import {
  systemCapabilitiesSchema,
  shortcutsStatusSchema,
  resourceStatusSchema
} from '../../../shared/system'
import type { SystemService } from '../../services/system/systemService'
import { handle } from './register'

/** Canales de solo lectura y una única operación de liberación controlada. */
export function registerSystemHandlers(system: SystemService): void {
  handle(IPC_CHANNELS.system.getCapabilities, z.undefined(), () =>
    systemCapabilitiesSchema.parse(system.getCapabilities())
  )
  handle(IPC_CHANNELS.system.getHardwareInfo, z.undefined(), () => system.getHardwareInfo())
  handle(IPC_CHANNELS.system.getShortcutsStatus, z.undefined(), () =>
    shortcutsStatusSchema.parse(system.getShortcutsStatus())
  )
  handle(IPC_CHANNELS.system.getDiagnostics, z.undefined(), () => system.getDiagnostics())
  handle(IPC_CHANNELS.system.releaseResources, z.undefined(), () => {
    const released = system.releaseResources()
    return resourceStatusSchema.parse(released)
  })
}
