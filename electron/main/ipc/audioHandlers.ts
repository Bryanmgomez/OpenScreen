import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import type { AudioService } from '../../services/audio/audioService'
import { handle } from './register'

/** Expone únicamente las capacidades de audio calculadas en main. */
export function registerAudioHandlers(audio: AudioService): void {
  handle(IPC_CHANNELS.audio.getSupport, z.undefined(), () => audio.getSupport())
}
