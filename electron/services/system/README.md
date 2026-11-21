# services/system

**Estado: implementado (Sesión 08).**

Responsabilidad: capacidades reales del entorno, efectos del sistema derivados de los ajustes y
diagnóstico ligero del proceso main. Todo lo que no se ha podido comprobar viaja como
`supported: false` con motivo, o como `null` en el caso de métricas y hardware.

## Qué hace

- `applySettings()` sincroniza `nativeTheme.themeSource`, el inicio con el sistema, los atajos
  globales y la bandeja. El inicio con el sistema solo se aplica con la app empaquetada en
  Windows/macOS; en otros casos se informa del motivo.
- La bandeja se crea cuando existe una ventana que puede quedar oculta (`minimizeOnClose` o
  `startMinimized`). Su opción «Salir» llama a `app.quit()` y deja que `before-quit` ejecute la
  limpieza completa.
- `applyShortcuts()` registra los aceleradores válidos con `globalShortcut`. Cada acción informa si
  quedó registrada o si el sistema/otra aplicación reclamó la combinación. Los atajos se normalizan
  y validan en `shared/shortcuts.ts` antes de persistirse.
- `getCapabilities()`, `getHardwareInfo()` y `getDiagnostics()` alimentan el panel de rendimiento.
  `getHardwareInfo()` usa `os`, `screen` y `app.getGPUInfo('basic')`; si GPU o pantallas no se
  pueden consultar, el campo correspondiente queda `null`.
- `recordError()` mantiene un historial acotado, avisa al renderer por `system:error-occurred` y
  muestra una notificación solo si el usuario la activó y Electron la soporta.
- `releaseResources()` libera cachés y termina procesos FFmpeg gestionados solo cuando no hay una
  grabación activa. Es la única operación de escritura de los canales `system:*`.

## Límites

El registro real de atajos, el inicio con el sistema, la bandeja y las notificaciones dependen del
sistema operativo y no se simulan en las pruebas automatizadas. La interfaz consulta su estado en
tiempo de ejecución y muestra el motivo cuando no están disponibles.
