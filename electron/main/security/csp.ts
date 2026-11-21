/**
 * Política de seguridad de contenido (CSP) de la aplicación.
 *
 * Producción: solo recursos propios, sin scripts en línea ni `eval`.
 * Desarrollo: se relajan únicamente `script-src` (preámbulo de React Refresh) y
 * `connect-src` (WebSocket de HMR de Vite).
 */
export interface CspOptions {
  dev: boolean
}

export function buildCsp({ dev }: CspOptions): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': dev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    // React usa atributos style en línea; se permite solo para estilos.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'media-src': ["'self'", 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': dev ? ["'self'", 'ws:', 'http:'] : ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"]
  }

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}
