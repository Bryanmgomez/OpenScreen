import { z } from 'zod'
import { SHORTCUT_ACTIONS, type ShortcutAction } from './shortcuts'

/**
 * Contratos de capacidades reales, rendimiento y diagnóstico. Todo lo que no se pudo medir
 * viaja como `null` o con `supported: false`; nunca se rellena con un valor estimado.
 */

export const platformNameSchema = z.enum(['win32', 'darwin', 'linux', 'other'])
export type PlatformName = z.infer<typeof platformNameSchema>

export const featureSupportSchema = z
  .object({
    supported: z.boolean(),
    reason: z.string().nullable()
  })
  .strict()
export type FeatureSupport = z.infer<typeof featureSupportSchema>

export const systemCapabilitiesSchema = z
  .object({
    platform: platformNameSchema,
    arch: z.string(),
    packaged: z.boolean(),
    startAtLogin: featureSupportSchema,
    notifications: featureSupportSchema,
    tray: featureSupportSchema,
    globalShortcuts: featureSupportSchema,
    metrics: featureSupportSchema,
    hardwareInfo: featureSupportSchema
  })
  .strict()
export type SystemCapabilities = z.infer<typeof systemCapabilitiesSchema>

export const shortcutRegistrationSchema = z
  .object({
    action: z.enum(SHORTCUT_ACTIONS),
    accelerator: z.string(),
    registered: z.boolean(),
    reason: z.string().nullable()
  })
  .strict()
export type ShortcutRegistration = z.infer<typeof shortcutRegistrationSchema>

export const shortcutsStatusSchema = z
  .object({
    enabled: z.boolean(),
    registrations: z.array(shortcutRegistrationSchema)
  })
  .strict()
export type ShortcutsStatus = z.infer<typeof shortcutsStatusSchema>

export interface ShortcutTriggerPayload {
  action: ShortcutAction
  at: number
}

export const hardwareInfoSchema = z
  .object({
    platform: platformNameSchema,
    arch: z.string(),
    cpuModel: z.string().nullable(),
    cpuCores: z.number().int().positive().nullable(),
    totalMemoryGb: z.number().positive().nullable(),
    displayCount: z.number().int().nonnegative().nullable(),
    gpu: z
      .object({
        vendorId: z.string().nullable(),
        deviceId: z.string().nullable(),
        vendorString: z.string().nullable(),
        deviceString: z.string().nullable()
      })
      .strict()
      .nullable(),
    detectedAt: z.number()
  })
  .strict()
export type HardwareInfo = z.infer<typeof hardwareInfoSchema>

export const processMetricSchema = z
  .object({
    type: z.enum(['browser', 'renderer', 'gpu', 'utility', 'other']),
    pid: z.number().int().nonnegative().nullable(),
    cpuPercent: z.number().nonnegative().nullable(),
    memoryMb: z.number().nonnegative().nullable()
  })
  .strict()
export type ProcessMetric = z.infer<typeof processMetricSchema>

export const performanceSnapshotSchema = z
  .object({
    sampledAt: z.number(),
    intervalMs: z.number().int().positive(),
    supported: z.boolean(),
    reason: z.string().nullable(),
    systemMemory: z
      .object({
        totalGb: z.number().positive().nullable(),
        freeGb: z.number().nonnegative().nullable(),
        usedPercent: z.number().min(0).max(100).nullable()
      })
      .strict(),
    processes: z.array(processMetricSchema),
    totalMemoryMb: z.number().nonnegative().nullable(),
    totalCpuPercent: z.number().nonnegative().nullable()
  })
  .strict()
export type PerformanceSnapshot = z.infer<typeof performanceSnapshotSchema>

export const diagnosticErrorSchema = z
  .object({
    id: z.string(),
    at: z.number(),
    source: z.string(),
    message: z.string(),
    stack: z.string().nullable()
  })
  .strict()
export type DiagnosticError = z.infer<typeof diagnosticErrorSchema>

export const resourceStatusSchema = z
  .object({
    activeRecordings: z.number().int().nonnegative(),
    openFileHandles: z.number().int().nonnegative(),
    activeFfmpegProcesses: z.number().int().nonnegative(),
    managedTempFiles: z.number().int().nonnegative(),
    gcAvailable: z.boolean(),
    releasedAt: z.number().nullable()
  })
  .strict()
export type ResourceStatus = z.infer<typeof resourceStatusSchema>

export const diagnosticsSnapshotSchema = z
  .object({
    errors: z.array(diagnosticErrorSchema),
    resources: resourceStatusSchema,
    performance: performanceSnapshotSchema,
    hardware: hardwareInfoSchema.nullable(),
    generatedAt: z.number()
  })
  .strict()
export type DiagnosticsSnapshot = z.infer<typeof diagnosticsSnapshotSchema>

export function emptyShortcutsStatus(): ShortcutsStatus {
  return { enabled: false, registrations: [] }
}
