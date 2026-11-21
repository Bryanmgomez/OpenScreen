import { app } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isTrustedRendererUrl } from './trust'

/** URL del servidor de Vite (solo existe en desarrollo y con la app sin empaquetar). */
export function devServerUrl(): string | undefined {
  return app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
}

/** URL `file://` del renderer empaquetado (out/renderer/index.html). */
export function rendererFileUrl(): string {
  return pathToFileURL(join(__dirname, '../renderer/index.html')).toString()
}

/** ¿Esta URL es la interfaz propia de OpenScreen? */
export function isTrustedUrl(url: string): boolean {
  return isTrustedRendererUrl(url, {
    devServerUrl: devServerUrl(),
    rendererFileUrl: rendererFileUrl()
  })
}
