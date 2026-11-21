# Seguridad

Medidas aplicadas hasta la Fase 6 (Sesión 08) y dónde viven.

| Medida | Dónde |
| --- | --- |
| `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` | `electron/main/window.ts` |
| DevTools solo en desarrollo | `electron/main/window.ts` |
| Preload con API mínima y tipada; no se expone `ipcRenderer` ni Node | `electron/preload/index.ts` |
| Validación de cada mensaje IPC con zod antes de ejecutar nada | `electron/main/ipc/register.ts` |
| Rechazo de mensajes cuyo remitente no sea el frame principal del renderer propio | `electron/main/ipc/register.ts`, `security/trust.ts` |
| Permisos denegados por defecto, excepto `display-capture` y `media` de audio (no cámara) solo para el renderer propio | `electron/main/security/session.ts` |
| La fuente del `MediaStream` la decide main, nunca la página (`setDisplayMediaRequestHandler`) | `electron/main/index.ts` |
| CSP estricta por cabecera (y por `<meta>` en producción) | `security/csp.ts`, `electron.vite.config.ts` |
| Sin ventanas nuevas, sin `<webview>`, sin navegación fuera de la UI propia | `security/session.ts` |
| Una sola instancia de la aplicación | `electron/main/index.ts` |
| Lectura tolerante y escritura atómica de ajustes | `services/settings/settingsService.ts` |
| Una sola grabación activa, chunks ordenados y temporales limpios | `services/recording/recordingService.ts` |
| Rutas de grabación restringidas a la carpeta configurada | `services/recording/model.ts`, `recordingService.ts` |
| Esquema privado `openscreen-media://` validado en main antes de servir bytes | `main/mediaProtocol.ts` |
| Renombrado atómico con reversión y borrado limitado a rutas canónicas | `services/recording/recordingService.ts` |
| Limpieza solo de temporales gestionados huérfanos | `services/recording/recordingService.ts` |
| Ajustes v2: lectura tolerante campo por campo y parche IPC estricto con zod | `shared/settings.ts`, `services/settings/settingsService.ts` |
| Atajos globales normalizados: sin teclas sueltas, combinaciones reservadas ni colisiones internas | `shared/shortcuts.ts`, `services/system/systemService.ts` |
| Inicio con el sistema restringido a la app empaquetada en Windows/macOS | `services/system/systemService.ts` |
| Bandeja creada solo si mantiene una ventana oculta; «Salir» pasa por `before-quit` | `main/index.ts`, `services/system/systemService.ts` |
| Diagnóstico de solo lectura; liberación de recursos bloqueada durante grabaciones activas | `main/ipc/systemHandlers.ts`, `services/system/systemService.ts` |
| Historial de errores acotado y notificaciones supeditadas al ajuste del usuario | `services/system/systemService.ts` |

## CSP de producción

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
media-src 'self' blob: openscreen-media:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none';
base-uri 'none'; form-action 'none'
```

`style-src 'unsafe-inline'` es necesario porque React usa atributos `style`. No se permiten scripts en línea ni `eval`.
`openscreen-media:` se registra como esquema privilegiado antes de `ready`, pero mantiene
`bypassCSP: false`: solo se añade a `media-src`. Main comprueba host, contención de ruta, extensión
y existencia en cada petición, y responde con CORS únicamente para permitir el fotograma del
`<canvas>`; no se desactiva `webSecurity` ni se exponen rutas `file://` al renderer.

## Reglas de las fases implementadas

- `display-capture` y `media` (solo audio, nunca cámara) se conceden de forma explícita y mínima al
  frame principal del renderer propio. El loopback del sistema se concede en Windows cuando la
  pista está activa y el ajuste es automático.
- Toda ruta de archivo recibida del renderer se valida y normaliza en main. `recording:reveal`,
  `recording:open`, `recording:delete`, `recording:rename`, `recording:get-media-url` y la limpieza
  solo operan dentro de la carpeta de grabaciones resuelta.
- FFmpeg se lanza con arreglos de argumentos (`node:child_process.spawn`), nunca concatenando
  cadenas de shell. La ruta del binario es configurable, pero no se interpreta como comando.
- La biblioteca solo muestra metadatos validados: lo que no se pudo comprobar viaja como `null` y
  se etiqueta como desconocido. El borrado requiere escribir el nombre exacto y el renombrado se
  revierte por completo si falla alguno de sus pasos.
- Los ajustes persistidos se reconstruyen con valores por defecto por campo; un archivo corrupto o
  antiguo no impide iniciar la aplicación. En cambio, un `settings:update` con claves desconocidas
  o valores fuera de rango se rechaza antes de escribir.
- Los atajos globales se validan en `shared/shortcuts.ts` antes de persistirse. Electron informa
  del registro real: si el sistema u otra aplicación se queda con la combinación, la interfaz lo
  muestra como no registrado en lugar de activar una acción que no funcionaría.
- `system:release-resources` solo libera cachés y termina procesos FFmpeg gestionados cuando no hay
  grabación activa. El resto de los canales `system:*` son de solo lectura. Las capacidades y
  métricas no medidas viajan como `supported: false` o `null`, nunca como valores estimados.
- Las notificaciones de finalización y error respetan los ajustes del usuario y la disponibilidad
  real de Electron. El historial de errores está acotado para no convertir un fallo repetido en un
  consumo de memoria creciente.

## Limitaciones conocidas

- Un renderer comprometido aún podría invocar los canales IPC existentes; por eso cada canal valida sus datos y expone solo la operación necesaria. En particular no puede pedir una fuente arbitraria: solo seleccionar una de las enumeradas por main.
- Mediante `recording:get-media-url` solo puede solicitar contenedores terminados dentro de la carpeta configurada; main vuelve a validar la URL y la ruta en cada petición de bytes. No hay acceso a `file://` arbitrario.
- Los atajos globales dependen de permisos del sistema (en macOS, Accesibilidad) y de que otra
  aplicación no haya reclamado la combinación; no se pueden garantizar desde la app.
- El inicio con el sistema solo se aplica a la aplicación instalada en Windows/macOS. En
  desarrollo o en Linux se informa del motivo y el control queda deshabilitado.
- No hay firma de código ni actualizaciones automáticas todavía (Fase 7).

## Reportar vulnerabilidades

Abre un aviso de seguridad privado en el repositorio de GitHub en lugar de una incidencia pública.
