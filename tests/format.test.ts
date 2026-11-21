import { describe, expect, it } from 'vitest'
import { formatDate, formatDuration } from '../src/utils/format'

describe('formatDuration', () => {
  it('formatea minutos y segundos', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
  })

  it('incluye horas cuando corresponde', () => {
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })

  it('trata valores negativos como cero', () => {
    expect(formatDuration(-5000)).toBe('0:00')
  })
})

describe('formatDate', () => {
  it('devuelve un guion ante fechas inválidas', () => {
    expect(formatDate('no-es-fecha')).toBe('—')
  })

  it('formatea fechas válidas', () => {
    expect(formatDate('2026-11-20T14:05:00')).toMatch(/2026/)
  })
})
