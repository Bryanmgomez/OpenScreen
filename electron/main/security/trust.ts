/**
 * Decide si una URL pertenece al renderer propio de la aplicación.
 *
 * - En desarrollo (`devServerUrl` definido) solo es confiable el origen del servidor de Vite.
 * - En producción solo es confiable el archivo HTML empaquetado (la parte `#hash` del router
 *   no forma parte del pathname, así que no afecta a la comparación).
 */
export interface TrustOptions {
  /** Origen del servidor de desarrollo; debe ser `undefined` en una app empaquetada. */
  devServerUrl?: string
  /** URL `file://` del index.html empaquetado. */
  rendererFileUrl: string
}

export function isTrustedRendererUrl(rawUrl: string, options: TrustOptions): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  if (options.devServerUrl) {
    try {
      return url.origin === new URL(options.devServerUrl).origin
    } catch {
      return false
    }
  }

  try {
    const expected = new URL(options.rendererFileUrl)
    return url.protocol === 'file:' && url.pathname === expected.pathname
  } catch {
    return false
  }
}
