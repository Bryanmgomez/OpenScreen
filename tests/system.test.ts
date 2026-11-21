import { describe, expect, it } from 'vitest'
import {
  diagnosticsSnapshotSchema,
  hardwareInfoSchema,
  performanceSnapshotSchema,
  shortcutsStatusSchema,
  systemCapabilitiesSchema
} from '@shared/system'

describe('contratos de capacidades y diagnóstico', () => {
  const capabilities = {
    platform: 'win32' as const,
    arch: 'x64',
    packaged: true,
    startAtLogin: { supported: true, reason: null },
    notifications: { supported: true, reason: null },
    tray: { supported: true, reason: null },
    globalShortcuts: { supported: true, reason: null },
    metrics: { supported: true, reason: null },
    hardwareInfo: { supported: true, reason: null }
  }

  const performance = {
    sampledAt: 1,
    intervalMs: 1000,
    supported: true,
    reason: null,
    systemMemory: { totalGb: 16, freeGb: 8, usedPercent: 50 },
    processes: [{ type: 'browser' as const, pid: 1, cpuPercent: 0.5, memoryMb: 120 }],
    totalMemoryMb: 120,
    totalCpuPercent: 0.5
  }

  it('valida capacidades reales y rechaza plataformas inventadas', () => {
    expect(systemCapabilitiesSchema.safeParse(capabilities).success).toBe(true)
    expect(
      systemCapabilitiesSchema.safeParse({ ...capabilities, platform: 'amiga' }).success
    ).toBe(false)
  })

  it('acepta métricas con valores desconocidos como null', () => {
    expect(performanceSnapshotSchema.safeParse(performance).success).toBe(true)
    expect(
      performanceSnapshotSchema.safeParse({
        ...performance,
        processes: [{ type: 'renderer', pid: null, cpuPercent: null, memoryMb: null }]
      }).success
    ).toBe(true)
  })

  it('exige los campos del diagnóstico completo', () => {
    const snapshot = {
      errors: [],
      resources: {
        activeRecordings: 0,
        openFileHandles: 0,
        activeFfmpegProcesses: 0,
        managedTempFiles: 0,
        gcAvailable: false,
        releasedAt: null
      },
      performance,
      hardware: null,
      generatedAt: 2
    }
    expect(diagnosticsSnapshotSchema.safeParse(snapshot).success).toBe(true)
    expect(diagnosticsSnapshotSchema.safeParse({ ...snapshot, errors: [{}] }).success).toBe(false)
  })

  it('valida hardware y estado de atajos', () => {
    expect(
      hardwareInfoSchema.safeParse({
        platform: 'darwin',
        arch: 'arm64',
        cpuModel: null,
        cpuCores: 8,
        totalMemoryGb: 16,
        displayCount: 1,
        gpu: null,
        detectedAt: 3
      }).success
    ).toBe(true)
    expect(
      shortcutsStatusSchema.safeParse({
        enabled: true,
        registrations: [
          {
            action: 'start',
            accelerator: 'CmdOrCtrl+Alt+S',
            registered: false,
            reason: 'Ocupada por otra aplicación.'
          }
        ]
      }).success
    ).toBe(true)
  })
})
