import { BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { IPC_CHANNELS } from '../../../shared/channels'
import { handle } from './register'

/** La ventana que envió el mensaje; los controles solo actúan sobre su propia ventana. */
function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('No se encontró la ventana del remitente.')
  return win
}

export function registerWindowHandlers(): void {
  const none = z.undefined()

  handle(IPC_CHANNELS.window.minimize, none, (_input, event) => {
    senderWindow(event).minimize()
  })

  handle(IPC_CHANNELS.window.toggleMaximize, none, (_input, event) => {
    const win = senderWindow(event)
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })

  handle(IPC_CHANNELS.window.close, none, (_input, event) => {
    senderWindow(event).close()
  })

  handle(IPC_CHANNELS.window.isMaximized, none, (_input, event) => senderWindow(event).isMaximized())
}
