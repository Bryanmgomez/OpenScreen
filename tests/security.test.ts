import { describe, expect, it } from 'vitest'
import { buildCsp } from '../electron/main/security/csp'
import { isTrustedRendererUrl } from '../electron/main/security/trust'

const FILE_URL = 'file:///C:/Program%20Files/OpenScreen/resources/app.asar/out/renderer/index.html'

describe('isTrustedRendererUrl (producción)', () => {
  const options = { rendererFileUrl: FILE_URL }

  it('acepta el index.html empaquetado, con o sin hash del router', () => {
    expect(isTrustedRendererUrl(FILE_URL, options)).toBe(true)
    expect(isTrustedRendererUrl(`${FILE_URL}#/settings`, options)).toBe(true)
  })

  it('rechaza otros archivos locales y sitios externos', () => {
    expect(isTrustedRendererUrl('file:///C:/Users/x/malicioso.html', options)).toBe(false)
    expect(isTrustedRendererUrl('https://example.com/', options)).toBe(false)
    expect(isTrustedRendererUrl('javascript:alert(1)', options)).toBe(false)
  })

  it('rechaza URLs mal formadas', () => {
    expect(isTrustedRendererUrl('', options)).toBe(false)
    expect(isTrustedRendererUrl('no es una url', options)).toBe(false)
  })

  it('no confía en el servidor de desarrollo', () => {
    expect(isTrustedRendererUrl('http://localhost:5173/', options)).toBe(false)
  })
})

describe('isTrustedRendererUrl (desarrollo)', () => {
  const options = { devServerUrl: 'http://localhost:5173/', rendererFileUrl: FILE_URL }

  it('acepta solo el origen del servidor de Vite', () => {
    expect(isTrustedRendererUrl('http://localhost:5173/#/library', options)).toBe(true)
    expect(isTrustedRendererUrl('http://localhost:5174/', options)).toBe(false)
    expect(isTrustedRendererUrl('https://example.com/', options)).toBe(false)
    expect(isTrustedRendererUrl(FILE_URL, options)).toBe(false)
  })
})

describe('buildCsp', () => {
  it('en producción no permite scripts en línea ni eval', () => {
    const csp = buildCsp({ dev: false })
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).not.toContain('ws:')
  })

  it('en desarrollo permite el cliente HMR de Vite', () => {
    const csp = buildCsp({ dev: true })
    expect(csp).toContain('ws:')
    expect(csp).not.toContain('unsafe-eval')
  })
})
