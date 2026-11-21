# Seguridad

Medidas aplicadas hasta la Fase 5 (Sesión 07) y dónde viven.

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

## Limitaciones conocidas

- Un renderer comprometido aún podría invocar los canales IPC existentes; por eso cada canal valida sus datos y expone solo la operación necesaria. En particular no puede pedir una fuente arbitraria: solo seleccionar una de las enumeradas por main.
- Mediante `recording:get-media-url` solo puede solicitar contenedores terminados dentro de la carpeta configurada; main vuelve a validar la URL y la ruta en cada petición de bytes. No hay acceso a `file://` arbitrario.
- No hay firma de código ni actualizaciones automáticas todavía (Fase 6).

## Reportar vulnerabilidades

Abre un aviso de seguridad privado en el repositorio de GitHub en lugar de una incidencia pública.
