# Seguridad

Medidas aplicadas en la Fase 1 y dónde viven.

| Medida | Dónde |
| --- | --- |
| `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` | `electron/main/window.ts` |
| DevTools solo en desarrollo | `electron/main/window.ts` |
| Preload con API mínima y tipada; no se expone `ipcRenderer` ni Node | `electron/preload/index.ts` |
| Validación de cada mensaje IPC con zod antes de ejecutar nada | `electron/main/ipc/register.ts` |
| Rechazo de mensajes cuyo remitente no sea el frame principal del renderer propio | `electron/main/ipc/register.ts`, `security/trust.ts` |
| Todos los permisos del navegador denegados por defecto | `electron/main/security/session.ts` |
| CSP estricta por cabecera (y por `<meta>` en producción) | `security/csp.ts`, `electron.vite.config.ts` |
| Sin ventanas nuevas, sin `<webview>`, sin navegación fuera de la UI propia | `security/session.ts` |
| Una sola instancia de la aplicación | `electron/main/index.ts` |
| Lectura tolerante y escritura atómica de ajustes | `services/settings/settingsService.ts` |

## CSP de producción

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none';
base-uri 'none'; form-action 'none'
```

`style-src 'unsafe-inline'` es necesario porque React usa atributos `style`. No se permiten scripts en línea ni `eval`.

## Reglas para las siguientes fases

- Los permisos de captura y micrófono se habilitarán de forma explícita y mínima, solo para el renderer propio.
- Toda ruta de archivo recibida del renderer se validará y normalizará en main.
- FFmpeg y otros ejecutables se lanzarán con arreglos de argumentos, nunca concatenando cadenas de shell.

## Limitaciones conocidas

- Un renderer comprometido aún podría invocar los canales IPC existentes; por eso cada canal valida sus datos y expone solo la operación necesaria.
- No hay firma de código ni actualizaciones automáticas todavía (Fase 6).

## Reportar vulnerabilidades

Abre un aviso de seguridad privado en el repositorio de GitHub en lugar de una incidencia pública.
