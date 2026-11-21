import { app, session, type WebContents } from 'electron'
import { buildCsp } from './csp'
import { isTrustedUrl } from './renderer'

/**
 * Endurece la sesión por defecto.
 *
 * - Deniega todos los permisos del navegador salvo `display-capture`, que se concede
 *   únicamente al frame principal de nuestra propia interfaz (Sesión 03). Micrófono y
 *   audio del sistema se habilitarán de forma explícita en la Fase 3.
 * - Aplica la CSP por cabecera de respuesta.
 */
export function applySessionSecurity(): void {
  const ses = session.defaultSession

  const canCapture = (webContents: WebContents | null): boolean =>
    Boolean(webContents && isTrustedUrl(webContents.getURL()))

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'display-capture' && canCapture(webContents))
  })
  ses.setPermissionCheckHandler((webContents, permission) =>
    permission === 'display-capture' && canCapture(webContents)
  )

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
