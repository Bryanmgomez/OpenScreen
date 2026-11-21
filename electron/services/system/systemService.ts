import { randomUUID } from 'node:crypto'
import { cpus, freemem, totalmem } from 'node:os'
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeTheme,
  Notification,
  screen,
  Tray,
  type NativeImage
} from 'electron'
import { IPC_CHANNELS } from '../../../shared/channels'
import type { Settings } from '../../../shared/settings'
import {
  SHORTCUT_ACTIONS,
  duplicateShortcutActions,
  normalizeAccelerator,
  type ShortcutAction
} from '../../../shared/shortcuts'
import type {
  DiagnosticError,
  DiagnosticsSnapshot,
  FeatureSupport,
  HardwareInfo,
  PerformanceSnapshot,
  PlatformName,
  ProcessMetric,
  ResourceStatus,
  ShortcutsStatus,
  SystemCapabilities
} from '../../../shared/system'

export interface SystemResourceCounts {
  activeRecordings: number
  openFileHandles: number
  activeFfmpegProcesses: number
  managedTempFiles: number
}

export interface SystemServiceOptions {
  settings: {
    get(): Settings
  }
  /** Número de processes multimedia activos que se pueden terminar sin perder trabajo. */
  getResourceCounts(): SystemResourceCounts
  /** Termina procesos FFmpeg gestionados. Main solo lo llama si no hay grabación activa. */
  terminateManagedMediaProcesses(): void
  getTrayIcon(): NativeImage | null
  onTrayShow(): void
  onTrayQuit(): void
}

function platformName(): PlatformName {
  const platform = process.platform
  return platform === 'win32' || platform === 'darwin' || platform === 'linux'
    ? platform
    : 'other'
}

function support(supported: boolean, reason: string | null): FeatureSupport {
  return { supported, reason }
}

function errorParts(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack ?? null }
  }
  return { message: String(error), stack: null }
}

function processType(type: string): ProcessMetric['type'] {
  if (type === 'Browser') return 'browser'
  if (type === 'Tab') return 'renderer'
  if (type === 'GPU') return 'gpu'
  if (type === 'Utility') return 'utility'
  return 'other'
}

/**
 * Servicio del sistema: capacidades reales, atajos globales, diagnóstico ligero y liberación
 * de recursos. Nunca informa de una capacidad que Electron no ha confirmado en esta sesión.
 */
export class SystemService {
  private readonly errors: DiagnosticError[] = []
  private registrations: ShortcutsStatus = { enabled: false, registrations: [] }
  private hardware: HardwareInfo | null = null
  private lastMetricsAt = Date.now()
  private lastReleaseAt: number | null = null
  private appliedLoginAtLogin: boolean | null = null
  private tray: Tray | null = null

  constructor(private readonly options: SystemServiceOptions) {}

  /** Debe llamarse tras `ready` y cada vez que cambien los ajustes. */
  applySettings(settings: Settings): void {
    nativeTheme.themeSource = settings.appearance.theme
    this.applyLoginItem(settings.general.startAtLogin)
    this.applyShortcuts(settings)
    this.applyTray(settings)
  }

  getCapabilities(): SystemCapabilities {
    const loginSupported = app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin')
    return {
      platform: platformName(),
      arch: process.arch,
      packaged: app.isPackaged,
      startAtLogin: support(
        loginSupported,
        loginSupported
          ? null
          : 'Solo se aplica en la aplicación instalada de Windows o macOS.'
      ),
      notifications: support(Notification.isSupported(), null),
      tray: support(true, null),
      globalShortcuts: support(
        true,
        process.platform === 'darwin'
          ? 'macOS puede pedir permiso de Accesibilidad para atajos globales.'
          : null
      ),
      metrics: support(typeof app.getAppMetrics === 'function', null),
      hardwareInfo: support(true, null)
    }
  }

  getShortcutsStatus(): ShortcutsStatus {
    return {
      enabled: this.registrations.enabled,
      registrations: this.registrations.registrations.map((item) => ({ ...item }))
    }
  }

  async getHardwareInfo(): Promise<HardwareInfo> {
    if (this.hardware) return this.hardware
    const cpuList = cpus()
    let gpu: HardwareInfo['gpu'] = null
    try {
      const info = (await app.getGPUInfo('basic')) as {
        gpuDevice?: Array<{ vendorId?: number | string; deviceId?: number | string; driverVendor?: string; driverVersion?: string }>
      }
      const device = info.gpuDevice?.[0]
      if (device) {
        const vendorId = device.vendorId === undefined ? null : String(device.vendorId)
        const deviceId = device.deviceId === undefined ? null : String(device.deviceId)
        const description = [device.driverVendor, device.driverVersion].filter(Boolean).join(' ')
        gpu = {
          vendorId,
          deviceId,
          vendorString: description || null,
          deviceString: null
        }
      }
    } catch {
      // Sin GPU identifiable: el campo queda null en lugar de inventarse un modelo.
    }

    let displayCount: number | null = null
    try {
      displayCount = screen.getAllDisplays().length
    } catch {
      displayCount = null
    }

    this.hardware = {
      platform: platformName(),
      arch: process.arch,
      cpuModel: cpuList[0]?.model ?? null,
      cpuCores: cpuList.length > 0 ? cpuList.length : null,
      totalMemoryGb: totalmem() / 1024 ** 3,
      displayCount,
      gpu,
      detectedAt: Date.now()
    }
    return this.hardware
  }

  getDiagnostics(): Promise<DiagnosticsSnapshot> {
    return Promise.resolve({
      errors: this.errors.map((item) => ({ ...item })),
      resources: this.resourceStatus(),
      performance: this.performanceSnapshot(),
      hardware: this.hardware ? { ...this.hardware } : null,
      generatedAt: Date.now()
    })
  }

  /** Registra un error real, con historial acotado y aviso al renderer. */
  recordError(source: string, error: unknown): DiagnosticError {
    const parts = errorParts(error)
    const item: DiagnosticError = {
      id: randomUUID(),
      at: Date.now(),
      source,
      message: parts.message.slice(0, 2000),
      stack: parts.stack?.slice(0, 8000) ?? null
    }
    const limit = this.options.settings.get().performance.errorHistoryLimit
    this.errors.unshift(item)
    if (this.errors.length > limit) this.errors.length = limit
    this.send(IPC_CHANNELS.system.errorOccurred, item)
    try {
      this.notifyError('OpenScreen', parts.message)
    } catch {
      // Un fallo al notificar no debe convertirse en otro error ni ocultar el original.
    }
    return item
  }

  notifyCompletion(title: string, body: string): void {
    const settings = this.options.settings.get().general.notifications
    if (!settings.enabled || !settings.recordingComplete) return
    if (Notification.isSupported()) new Notification({ title, body }).show()
  }

  notifyError(title: string, body: string): void {
    const settings = this.options.settings.get().general.notifications
    if (!settings.enabled || !settings.errors) return
    if (Notification.isSupported()) new Notification({ title, body }).show()
  }

  /** Fuerza la liberación de cachés/processos inactivos sin tocar una grabación en curso. */
  releaseResources(): ResourceStatus {
    if (this.options.getResourceCounts().activeRecordings === 0) {
      this.options.terminateManagedMediaProcesses()
    }
    const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc
    if (gc) gc()
    this.lastReleaseAt = Date.now()
    return this.resourceStatus()
  }

  resourceStatus(): ResourceStatus {
    const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc
    return {
      ...this.options.getResourceCounts(),
      gcAvailable: typeof gc === 'function',
      releasedAt: this.lastReleaseAt
    }
  }

  /** Se llama antes de `app.quit()`; no cambia la configuración persistida. */
  dispose(): void {
    globalShortcut.unregisterAll()
    this.tray?.destroy()
    this.tray = null
  }

  /** Instala los manejadores globales de errores del proceso principal. */
  installErrorHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.recordError('process:uncaughtException', error)
    })
    process.on('unhandledRejection', (reason) => {
      this.recordError('process:unhandledRejection', reason)
    })
    app.on('render-process-gone', (_event, webContents, details) => {
      this.recordError(`render-process-gone:${webContents.id}`, details.reason)
    })
    app.on('child-process-gone', (_event, details) => {
      if (details.reason === 'clean-exit') return
      this.recordError(`child-process-gone:${details.type}`, details.reason)
    })
  }

  private applyLoginItem(enabled: boolean): void {
    if (!this.getCapabilities().startAtLogin.supported) return
    if (this.appliedLoginAtLogin === enabled) return
    try {
      const current = app.getLoginItemSettings().openAtLogin
      if (current !== enabled) app.setLoginItemSettings({ openAtLogin: enabled })
      this.appliedLoginAtLogin = enabled
    } catch (error) {
      this.recordError('system:set-login-item', error)
    }
  }

  private applyShortcuts(settings: Settings): void {
    globalShortcut.unregisterAll()
    const bindings = settings.shortcuts.bindings
    const duplicates = duplicateShortcutActions(bindings)
    const registrations: ShortcutsStatus['registrations'] = []
    const enabled = settings.shortcuts.enabled

    if (!enabled) {
      this.registrations = {
        enabled: false,
        registrations: SHORTCUT_ACTIONS.map((action) => ({
          action,
          accelerator: normalizeAccelerator(bindings[action]) ?? bindings[action],
          registered: false,
          reason: 'Atajos globales desactivados.'
        }))
      }
      return
    }

    for (const action of SHORTCUT_ACTIONS) {
      const accelerator = normalizeAccelerator(bindings[action]) ?? bindings[action]
      if (duplicates.some((group) => group.includes(action))) {
        registrations.push({ action, accelerator, registered: false, reason: 'Atajo duplicado.' })
        continue
      }
      let registered = false
      let reason: string | null = null
      try {
        registered = globalShortcut.register(accelerator, () => this.trigger(action))
        if (!registered) {
          reason = 'El sistema u otra aplicación ya usa esta combinación (o falta un permiso).'
        }
      } catch (error) {
        reason = errorParts(error).message
      }
      registrations.push({ action, accelerator, registered, reason })
    }
    this.registrations = { enabled: true, registrations }
  }

  private trigger(action: ShortcutAction): void {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (win && win.isMinimized()) win.restore()
    win?.show()
    this.send(IPC_CHANNELS.system.shortcutTriggered, { action, at: Date.now() })
  }

  private applyTray(settings: Settings): void {
    // Sin bandeja, «Iniciar minimizado» dejaría la ventana sin acceso desde el escritorio.
    const enabled = settings.general.minimizeOnClose || settings.general.startMinimized
    if (!enabled) {
      this.tray?.destroy()
      this.tray = null
      return
    }
    if (this.tray) return
    const icon = this.options.getTrayIcon()
    if (!icon) {
      this.recordError('system:tray', 'No se pudo crear el icono de bandeja.')
      return
    }
    try {
      this.tray = new Tray(icon)
      this.tray.setToolTip('OpenScreen')
      this.tray.on('click', () => this.options.onTrayShow())
      this.tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: 'Mostrar OpenScreen', click: () => this.options.onTrayShow() },
          { type: 'separator' },
          { label: 'Salir', click: () => this.options.onTrayQuit() }
        ])
      )
    } catch (error) {
      this.recordError('system:tray', error)
      this.tray = null
    }
  }

  private performanceSnapshot(): PerformanceSnapshot {
    const now = Date.now()
    const intervalMs = Math.max(1, now - this.lastMetricsAt)
    this.lastMetricsAt = now
    let processes: ProcessMetric[] = []
    let supported = this.getCapabilities().metrics.supported
    let reason: string | null = null
    try {
      processes = app.getAppMetrics().map((metric) => ({
        type: processType(metric.type),
        pid: metric.pid,
        cpuPercent: Number.isFinite(metric.cpu.percentCPUUsage)
          ? Math.max(0, metric.cpu.percentCPUUsage)
          : null,
        memoryMb: Math.max(0, metric.memory.workingSetSize / 1024)
      }))
    } catch (error) {
      supported = false
      reason = errorParts(error).message
    }

    const totalBytes = totalmem()
    const freeBytes = freemem()
    const totalMemoryMb = processes.reduce(
      (sum, item) => sum + (item.memoryMb ?? 0),
      0
    )
    const totalCpuPercent = processes.reduce(
      (sum, item) => sum + (item.cpuPercent ?? 0),
      0
    )
    return {
      sampledAt: now,
      intervalMs,
      supported,
      reason,
      systemMemory: {
        totalGb: totalBytes / 1024 ** 3,
        freeGb: freeBytes / 1024 ** 3,
        usedPercent: totalBytes > 0 ? ((totalBytes - freeBytes) / totalBytes) * 100 : null
      },
      processes,
      totalMemoryMb,
      totalCpuPercent
    }
  }

  private send(channel: string, value: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(channel, value)
    }
  }
}
