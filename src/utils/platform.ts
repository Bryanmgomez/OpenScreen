import type { PlatformName } from '@shared/api'

const LABELS: Record<PlatformName, string> = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
  other: 'Otro'
}

export function platformLabel(platform: PlatformName): string {
  return LABELS[platform]
}
