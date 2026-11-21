import {
  spawn,
  type ChildProcess,
  type SpawnOptionsWithoutStdio
} from 'node:child_process'
import type { EncodingCapabilities } from '../../../shared/encoding'
import { probeFfmpegCapabilities } from './encodingProbe'
import { buildFfmpegArgs, type FfmpegArgsOptions } from './model'

type SpawnFn = (
  command: string,
  args: readonly string[],
  options?: SpawnOptionsWithoutStdio
) => ReturnType<typeof spawn>

export type FfmpegTranscodeOptions = FfmpegArgsOptions

/**
 * Integración real de FFmpeg. Se usa solo cuando MediaRecorder no puede producir el resultado
 * elegido (códec, aceleración o parámetros avanzados). Nunca se usa un string de shell.
 */
export class FfmpegService {
  private capabilities: Promise<EncodingCapabilities> | null = null
  private cachedBinary: string | null = null
  private readonly active = new Set<ChildProcess>()

  constructor(
    private readonly resolveBinary: () => string | null,
    private readonly spawnFn: SpawnFn = spawn,
    /** Tiempo máximo de una transcodificación; evita procesos huérfanos. */
    private readonly transcodeTimeoutMs = 900_000
  ) {}

  get binary(): string {
    return this.resolveBinary() || 'ffmpeg'
  }

  /** Sondeo real y cacheado; cambiar la ruta de FFmpeg invalida la caché. */
  getEncodingCapabilities(): Promise<EncodingCapabilities> {
    const binary = this.binary
    if (!this.capabilities || this.cachedBinary !== binary) {
      this.cachedBinary = binary
      this.capabilities = probeFfmpegCapabilities((args, timeoutMs) =>
        this.capture(args, timeoutMs)
      )
    }
    return this.capabilities
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.execute(['-version'], 4000)
      return true
    } catch {
      return false
    }
  }

  /** Salida real de un comando de sondeo, con timeout y sin shells. */
  async capture(args: readonly string[], timeoutMs = 4000): Promise<string> {
    return (await this.execute(args, timeoutMs)).stdout
  }

  async transcode(options: FfmpegTranscodeOptions): Promise<void> {
    const args = buildFfmpegArgs(options)
    if (args.length === 0) return
    await this.execute(args, this.transcodeTimeoutMs)
  }

  get activeProcessCount(): number {
    return this.active.size
  }

  /** Termina los procesos FFmpeg que sigan vivos. Solo se llama al liberar recursos/salir. */
  terminateProcesses(): number {
    let terminated = 0
    for (const child of this.active) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill()
        terminated += 1
      }
    }
    this.active.clear()
    return terminated
  }

  private execute(
    args: readonly string[],
    timeoutMs?: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = this.spawnFn(this.binary, args, { windowsHide: true })
      this.active.add(child)
      let stdout = ''
      let stderr = ''
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null

      const settle = (error?: Error): void => {
        if (settled) return
        settled = true
        this.active.delete(child)
        if (timer) clearTimeout(timer)
        if (error) reject(error)
        else resolve({ stdout, stderr })
      }

      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout = (stdout + String(chunk)).slice(-100_000)
      })
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
