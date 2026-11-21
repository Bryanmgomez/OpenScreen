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
| `recording:get-status` | invoke | — | `RecordingStatus` |
| `recording:begin` | invoke | `RecordingBeginRequest` (estricto) | `RecordingStatus` |
| `recording:pause` | invoke | — | `RecordingStatus` |
| `recording:resume` | invoke | — | `RecordingStatus` |
| `recording:append-chunk` | invoke | `RecordingChunk` (estricto) | `RecordingStatus` |
| `recording:finish` | invoke | `RecordingFinishRequest` (estricto) | `RecordingStatus` |
| `recording:cancel` | invoke | `RecordingSessionRequest` (estricto) | `RecordingStatus` |
| `recording:list` | invoke | — | `RecordingList` |
| `recording:reveal` | invoke | `RecordingFilePath` (estricto) | — |
| `recording:open` | invoke | `RecordingFilePath` (estricto) | — |
| `recording:delete` | invoke | `RecordingFilePath` (estricto) | `RecordingList` |
| `recording:pick-output-dir` | invoke | — | `string \| null` |
| `recording:check-ffmpeg` | invoke | — | `boolean` |
| `recording:status-changed` | evento main → renderer | — | `RecordingStatus` |

## Garantías

1. Solo se atienden mensajes del frame principal del renderer propio (`security/trust.ts`).
2. El argumento se valida con un esquema zod; si no cumple, el canal rechaza la llamada sin ejecutar nada.
3. Los controles de ventana actúan únicamente sobre la ventana que envió el mensaje.
4. Las fuentes de captura se revalidan en main: una referencia guardada que ya no existe se
   devuelve como no disponible; nunca se sustituye silenciosamente por otra fuente.
5. El estado de grabación y los archivos los controla main: solo hay una sesión activa, los chunks
   se escriben en orden y las rutas de reveal/open/delete se restringen a la carpeta de salida.
6. FFmpeg se lanza con arreglos de argumentos; nunca se concatena una cadena de shell.

Para añadir un canal, sigue los pasos de [CONTRIBUTING.md](../CONTRIBUTING.md).
