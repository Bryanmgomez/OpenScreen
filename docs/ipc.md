# IPC

La API completa que ve el renderer es `window.openscreen` (contrato en `shared/api.ts`).

## Canales actuales

| Canal | Tipo | Argumento | Respuesta |
| --- | --- | --- | --- |
| `app:get-info` | invoke | — | `AppInfo` (versiones, plataforma, `userData`) |
| `window:minimize` | invoke | — | — |
| `window:toggle-maximize` | invoke | — | `boolean` (estado de maximizado resultante) |
| `window:close` | invoke | — | — |
| `window:is-maximized` | invoke | — | `boolean` |
| `window:maximized-changed` | evento main → renderer | — | `boolean` |
| `settings:get` | invoke | — | `Settings` |
| `settings:update` | invoke | `SettingsPatch` (estricto) | `Settings` |
| `settings:changed` | evento main → renderer | — | `Settings` |
| `capture:get-snapshot` | invoke | — | `CaptureSnapshot` (monitores, ventanas, selección y avisos) |
| `capture:select-source` | invoke | `SourceRef` (estricto) | `CaptureSnapshot` |
| `capture:set-region` | invoke | `CaptureRegion` (estricto) | `CaptureSnapshot` |
| `capture:clear-selection` | invoke | — | `CaptureSnapshot` |
| `capture:sources-changed` | evento main → renderer | — | `CaptureSnapshot` |

## Garantías

1. Solo se atienden mensajes del frame principal del renderer propio (`security/trust.ts`).
2. El argumento se valida con un esquema zod; si no cumple, el canal rechaza la llamada sin ejecutar nada.
3. Los controles de ventana actúan únicamente sobre la ventana que envió el mensaje.
4. Las fuentes de captura se revalidan en main: una referencia guardada que ya no existe se
   devuelve como no disponible; nunca se sustituye silenciosamente por otra fuente.

Para añadir un canal, sigue los pasos de [CONTRIBUTING.md](../CONTRIBUTING.md).
