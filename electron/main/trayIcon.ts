import { nativeImage, type NativeImage } from 'electron'

/**
 * Icono de bandeja generado en código (16×16 RGBA), sin depender de un archivo externo ni de
 * una librería de imágenes. Es un PNG válido creado a partir de píxeles reales.
 */
const ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR4nGNgGDSgYsv//6Rg2hlArEtpbwAuJ48kA3AB2hswcClxwAAAzCgv0CcD1f8AAAAASUVORK5CYII='

export function createTrayIcon(): NativeImage | null {
  const image = nativeImage.createFromDataURL(ICON_DATA_URL)
  return image.isEmpty() ? null : image
}
