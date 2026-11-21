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

## Garantías

1. Solo se atienden mensajes del frame principal del renderer propio (`security/trust.ts`).
2. El argumento se valida con un esquema zod; si no cumple, el canal rechaza la llamada sin ejecutar nada.
3. Los controles de ventana actúan únicamente sobre la ventana que envió el mensaje.

Para añadir un canal, sigue los pasos de [CONTRIBUTING.md](../CONTRIBUTING.md).
