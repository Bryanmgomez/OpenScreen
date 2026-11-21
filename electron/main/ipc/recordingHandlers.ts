import { BrowserWindow, dialog } from 'electron'
import { resolve } from 'node:path'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import {
  recordingAudioChunkSchema,
  recordingAudioStateSchema,
  recordingBeginRequestSchema,
  recordingChunkSchema,
  recordingFilePathSchema,
  recordingFinishRequestSchema,
  recordingSessionRequestSchema
} from '../../../shared/recording'
import type { RecordingService } from '../../services/recording/recordingService'
import { handle } from './register'

/** Canales del motor de grabación. Todos pasan por `handle()` (origen + zod). */
export function registerRecordingHandlers(recording: RecordingService): void {
  const C = IPC_CHANNELS.recording

  handle(C.getStatus, z.undefined(), () => recording.getStatus())
  handle(C.begin, recordingBeginRequestSchema, (request) => recording.begin(request))
  handle(C.pause, z.undefined(), () => recording.pause())
  handle(C.resume, z.undefined(), () => recording.resume())
  handle(C.appendChunk, recordingChunkSchema, (chunk) => recording.appendChunk(chunk))
  handle(C.appendAudio, recordingAudioChunkSchema, (chunk) => recording.appendAudio(chunk))
  handle(C.audioState, recordingAudioStateSchema, (state) => recording.reportAudioState(state))
  handle(C.finish, recordingFinishRequestSchema, (request) => recording.finish(request))
  handle(C.cancel, recordingSessionRequestSchema, (request) => recording.cancel(request))
  handle(C.list, z.undefined(), () => recording.list())
  handle(C.reveal, recordingFilePathSchema, async ({ path }) => {
    await recording.reveal(path)
  })
  handle(C.open, recordingFilePathSchema, async ({ path }) => {
    await recording.open(path)
  })
  handle(C.delete, recordingFilePathSchema, async ({ path }) => recording.delete(path))
  handle(C.checkFfmpeg, z.undefined(), () => recording.checkFfmpeg())
  handle(C.pickOutputDir, z.undefined(), async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Carpeta para grabaciones'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return resolve(result.filePaths[0] as string)
  })

  recording.onStatusChange((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(C.statusChanged, status)
    }
  })
}
