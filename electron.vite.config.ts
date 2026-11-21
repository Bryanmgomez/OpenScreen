import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import { buildCsp } from './electron/main/security/csp'

/**
 * Inyecta la política CSP de producción como <meta> en el HTML compilado.
 * En desarrollo la CSP se aplica por cabecera desde el proceso main
 * (necesita permitir el cliente HMR de Vite), por eso solo actúa en `build`.
 */
function cspMetaPlugin(): Plugin {
  return {
    name: 'openscreen:csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const tag = `<meta http-equiv="Content-Security-Policy" content="${buildCsp({ dev: false })}" />`
      return html.replace('<!--openscreen:csp-->', tag)
    }
  }
}

export default defineConfig({
  main: {
    resolve: {
      alias: { '@shared': resolve('shared') }
    },
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main/index.ts') }
      }
    }
  },
  preload: {
    resolve: {
      alias: { '@shared': resolve('shared') }
    },
    build: {
      // El preload corre en un renderer con sandbox: solo puede hacer require('electron'),
      // así que todo lo demás debe quedar incluido en el bundle.
      externalizeDeps: false,
      rollupOptions: {
        input: { index: resolve('electron/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve('src'),
    resolve: {
      alias: {
        '@': resolve('src'),
        '@shared': resolve('shared')
      }
    },
    plugins: [react(), cspMetaPlugin()],
    build: {
      minify: true,
      rollupOptions: {
        input: resolve('src/index.html')
      }
    }
  }
})
