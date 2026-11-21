import { app, session, type WebContents } from 'electron'
import { buildCsp } from './csp'
import { isTrustedUrl } from './renderer'

/**
 * Endurece la sesión por defecto.
 *
 * - Deniega todos los permisos del navegador salvo `display-capture` y acceso a micrófono
 *   (`media` con `mediaTypes: ['audio']`), concedidos únicamente al frame principal de nuestra
 *   propia interfaz. La cámara y el resto de permisos siguen denegados.
 * - Aplica la CSP por cabecera de respuesta.
 */
export function applySessionSecurity(): void {
  const ses = session.defaultSession

  const canCapture = (webContents: WebContents | null): boolean =>
    Boolean(webContents && isTrustedUrl(webContents.getURL()))

  /** Chromium informa de cámara y micrófono como `media`; solo se permite audio. */
  const audioTypes = (details: unknown): string[] | null => {
    if (typeof details !== 'object' || details === null) return null
    const value = details as { mediaTypes?: unknown; mediaType?: unknown }
    if (Array.isArray(value.mediaTypes)) {
      return value.mediaTypes.filter(
        (type): type is string => type === 'audio' || type === 'video'
      )
    }
    return typeof value.mediaType === 'string' ? [value.mediaType] : null
  }
  const microphoneOnly = (details: unknown): boolean => {
    const types = audioTypes(details)
    return types !== null && types.includes('audio') && !types.includes('video')
  }

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (!canCapture(webContents)) return callback(false)
    if (permission === 'display-capture') return callback(true)
    if (permission === 'media') return callback(microphoneOnly(details))
    return callback(false)
  })
  ses.setPermissionCheckHandler((webContents, permission, _origin, details) => {
    if (!canCapture(webContents)) return false
    if (permission === 'display-capture') return true
    if (permission === 'media') return microphoneOnly(details)
    return false
  })

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
