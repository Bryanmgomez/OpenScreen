import { z } from 'zod'

/**
 * Contrato de detección de fuentes de captura.
 *
 * Los identificadores de `desktopCapturer` NO son permanentes: `window:XX:YY` cambia al
 * reabrir una ventana y `screen:ZZ:0` depende del orden de los monitores. Por eso la
 * selección persistida se guarda como una referencia y se revalida contra la lista real
 * en cada lectura (`selectionAvailable`).
 */

export const CAPTURE_SOURCE_KINDS = ['screen', 'window'] as const
export const captureSourceKindSchema = z.enum(CAPTURE_SOURCE_KINDS)
export type CaptureSourceKind = z.infer<typeof captureSourceKindSchema>

export const CAPTURE_PLATFORMS = ['win32', 'darwin', 'linux', 'other'] as const
export const capturePlatformSchema = z.enum(CAPTURE_PLATFORMS)
export type CapturePlatform = z.infer<typeof capturePlatformSchema>

/** Estado de permiso de captura, ampliado con `unsupported` para plataformas sin la API. */
export const MEDIA_ACCESS_STATUSES = [
  'granted',
  'denied',
  'not-determined',
  'restricted',
  'unknown',
  'unsupported'
] as const
export const mediaAccessStatusSchema = z.enum(MEDIA_ACCESS_STATUSES)
export type MediaAccessStatus = z.infer<typeof mediaAccessStatusSchema>

/** Referencia mínima que se persiste para recordar la fuente elegida. */
export const sourceRefSchema = z
  .object({
    id: z.string().min(1),
    kind: captureSourceKindSchema,
    name: z.string().min(1),
    displayId: z.string(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable()
  })
  .strict()
export type SourceRef = z.infer<typeof sourceRefSchema>

/** Región personalizada. Base para la selección rectangular (su captura llega después). */
export const captureRegionSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })
  .strict()
export type CaptureRegion = z.infer<typeof captureRegionSchema>

/** Monitor real, construido desde `screen.Display` en el proceso main. */
export const displayInfoSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  primary: z.boolean(),
  internal: z.boolean(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  physicalWidth: z.number().int().positive(),
  physicalHeight: z.number().int().positive(),
  scaleFactor: z.number().positive(),
  refreshRate: z.number().positive().nullable(),
  rotation: z.number().int()
})
export type DisplayInfo = z.infer<typeof displayInfoSchema>

/** Fuente real devuelta por `desktopCapturer.getSources`, enriquecida con su monitor. */
export const captureSourceSchema = z.object({
  id: z.string().min(1),
  kind: captureSourceKindSchema,
  name: z.string().min(1),
  displayId: z.string(),
  thumbnailUrl: z.string().nullable(),
  iconUrl: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  primary: z.boolean(),
  internal: z.boolean(),
  refreshRate: z.number().positive().nullable(),
  scaleFactor: z.number().positive().nullable()
})
export type CaptureSource = z.infer<typeof captureSourceSchema>

/** Instantánea completa enviada al renderer. Siempre describe el estado real del sistema. */
export const captureSnapshotSchema = z.object({
  displays: z.array(displayInfoSchema),
  sources: z.array(captureSourceSchema),
  selection: sourceRefSchema.nullable(),
  selectionAvailable: z.boolean(),
  region: captureRegionSchema.nullable(),
  permission: mediaAccessStatusSchema,
  platform: capturePlatformSchema,
  warnings: z.array(z.string()),
  generatedAt: z.number()
})
export type CaptureSnapshot = z.infer<typeof captureSnapshotSchema>
