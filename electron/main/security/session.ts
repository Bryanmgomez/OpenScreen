import { app, session } from 'electron'
import { buildCsp } from './csp'
import { isTrustedUrl } from './renderer'

/**
 * Endurece la sesión por defecto.
 *
 * - Deniega todos los permisos del navegador. En las Fases 2 y 3 se habilitarán de forma
 *   explícita y mínima (captura de pantalla, micrófono) para el renderer propio.
 * - Aplica la CSP por cabecera de respuesta.
 */
export function applySessionSecurity(): void {
  const ses = session.defaultSession

  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  ses.setPermissionCheckHandler(() => false)

  const csp = buildCsp({ dev: !app.isPackaged })
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

/**
 * Endurecimiento aplicado a cualquier contenido web que cree la aplicación:
 * sin ventanas nuevas, sin <webview> y sin navegación fuera de la interfaz propia.
 */
export function applyWebContentsHardening(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-attach-webview', (event) => event.preventDefault())
    contents.on('will-navigate', (event, url) => {
      if (!isTrustedUrl(url)) event.preventDefault()
    })
  })
}
