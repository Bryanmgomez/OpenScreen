import type { OpenScreenApi } from '@shared/api'

/**
 * Acceso único a la API del preload. Toda comunicación del renderer con el proceso main
 * pasa por aquí; los componentes nunca tocan `window.openscreen` directamente.
 */
export function getApi(): OpenScreenApi {
  const api = window.openscreen
  if (!api) {
    throw new Error(
      'La API de OpenScreen no está disponible. Esta interfaz debe ejecutarse dentro de Electron.'
    )
  }
  return api
}
