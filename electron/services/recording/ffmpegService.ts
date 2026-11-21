import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process'
import type { RecordingFormat, RecordingQuality } from '../../../shared/recording'
import { buildFfmpegArgs } from './model'

type SpawnFn = (
  command: string,
  args: readonly string[],
  options?: SpawnOptionsWithoutStdio
) => ReturnType<typeof spawn>

/**
 * Integración real de FFmpeg. Se usa solo cuando el formato elegido no puede producirse
 * con MediaRecorder (MP4) o para transcodificar. Nunca se usa un string de shell.
 */
export class FfmpegService {
  constructor(
    private readonly resolveBinary: () => string | null,
    private readonly spawnFn: SpawnFn = spawn
  ) {}

  get binary(): string {
    return this.resolveBinary() || 'ffmpeg'
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.run(['-version'], 4000)
      return true
    } catch {
      return false
    }
  }

  async transcode(options: {
    input: string
    output: string
    format: RecordingFormat
    quality: RecordingQuality
    audioInputs?: readonly string[]
  }): Promise<void> {
    const args = buildFfmpegArgs(options)
    if (args.length === 0) return
    await this.run(args)
  }

  private run(args: readonly string[], timeoutMs?: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const child = this.spawnFn(this.binary, args, { windowsHide: true })
      let stderr = ''
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null

      const settle = (error?: Error): void => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        if (error) reject(error)
        else resolve()
      }

      child.stdout?.on('data', () => undefined)
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr = (stderr + String(chunk)).slice(-8000)
      })
      child.on('error', (error) => settle(error))
      child.on('close', (code) => {
        if (code === 0) settle()
        else {
          const detail = stderr.trim().split('\n').slice(-3).join(' ').trim()
          settle(new Error(detail || `FFmpeg terminó con código ${code ?? 'desconocido'}.`))
        }
      })

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          child.kill()
          settle(new Error('FFmpeg no respondió a tiempo.'))
        }, timeoutMs)
      }
    })
  }
}
