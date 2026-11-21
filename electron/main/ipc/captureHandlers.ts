import { BrowserWindow } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import { captureRegionSchema, sourceRefSchema } from '../../../shared/capture'
import type { CaptureService } from '../../services/capture/captureService'
import { handle } from './register'

/** Canales de detección/selección de fuentes; todos pasan por `handle()` (sender + zod). */
export function registerCaptureHandlers(capture: CaptureService): void {
  handle(IPC_CHANNELS.capture.getSnapshot, z.undefined(), () => capture.getSnapshot())
  handle(IPC_CHANNELS.capture.selectSource, sourceRefSchema, (ref) => capture.selectSource(ref))
  handle(IPC_CHANNELS.capture.setRegion, captureRegionSchema, (region) => capture.setRegion(region))
  handle(IPC_CHANNELS.capture.clearSelection, z.undefined(), () => capture.clearSelection())

  capture.onSourcesChange((snapshot) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IPC_CHANNELS.capture.sourcesChanged, snapshot)
    }
  })
}
