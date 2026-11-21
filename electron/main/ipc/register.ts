import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { ZodType } from 'zod'
import { isTrustedUrl } from '../security/renderer'

/** Solo se aceptan mensajes del frame principal del renderer propio. */
function assertTrustedSender(event: IpcMainInvokeEvent, channel: string): void {
  const frame = event.senderFrame
  if (!frame || frame.parent !== null || !isTrustedUrl(frame.url)) {
    throw new Error(`IPC "${channel}" rechazado: origen no confiable.`)
  }
}

/**
 * Registra un manejador `invoke` con las garantías de seguridad del proyecto:
 * 1. verifica el origen del remitente,
 * 2. valida el argumento con un esquema zod antes de ejecutar nada.
 *
 * Los canales sin argumentos usan `z.undefined()`.
 */
export function handle<TInput, TResult>(
  channel: string,
  schema: ZodType<TInput>,
  handler: (input: TInput, event: IpcMainInvokeEvent) => TResult | Promise<TResult>
): void {
  ipcMain.handle(channel, async (event, raw: unknown) => {
    assertTrustedSender(event, channel)
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`IPC "${channel}": argumentos inválidos.`)
    }
    return handler(parsed.data, event)
  })
}
