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
| `audio:get-support` | invoke | — | `AudioSupport` (capacidades reales; nunca compatibilidad supuesta) |
| `recording:get-status` | invoke | — | `RecordingStatus` |
| `recording:begin` | invoke | `RecordingBeginRequest` (estricto, incluye `EncodingPlan`) | `RecordingStatus` |
| `recording:pause` | invoke | — | `RecordingStatus` |
| `recording:resume` | invoke | — | `RecordingStatus` |
| `recording:append-chunk` | invoke | `RecordingChunk` (estricto) | `RecordingStatus` |
| `recording:append-audio` | invoke | `RecordingAudioChunk` (estricto) | `RecordingStatus` |
| `recording:audio-state` | invoke | `RecordingAudioState` (estricto) | `RecordingStatus` |
| `recording:finish` | invoke | `RecordingFinishRequest` (estricto) | `RecordingStatus` |
| `recording:cancel` | invoke | `RecordingSessionRequest` (estricto) | `RecordingStatus` |
| `recording:list` | invoke | — | `RecordingLibrarySnapshot` |
| `recording:reveal` | invoke | `RecordingFilePath` (estricto) | — |
| `recording:open` | invoke | `RecordingFilePath` (estricto) | — |
| `recording:delete` | invoke | `RecordingFilePath` (estricto) | `RecordingLibrarySnapshot` |
| `recording:rename` | invoke | `RecordingRenameRequest` (estricto) | `RecordingLibrarySnapshot` |
| `recording:cleanup-temp` | invoke | — | `RecordingLibrarySnapshot` |
| `recording:get-storage-info` | invoke | — | `RecordingStorageInfo` |
| `recording:get-media-url` | invoke | `RecordingFilePath` (estricto) | `string` (URL privada validada) |
| `recording:pick-output-dir` | invoke | — | `string \| null` |
| `recording:check-ffmpeg` | invoke | — | `boolean` |
| `recording:get-encoding-capabilities` | invoke | — | `EncodingCapabilities` (formatos/códecs/aceleración probados; nunca inferidos) |
| `recording:status-changed` | evento main → renderer | — | `RecordingStatus` |

## Garantías

1. Solo se atienden mensajes del frame principal del renderer propio (`security/trust.ts`).
2. El argumento se valida con un esquema zod; si no cumple, el canal rechaza la llamada sin ejecutar nada.
3. Los controles de ventana actúan únicamente sobre la ventana que envió el mensaje.
4. Las fuentes de captura se revalidan en main: una referencia guardada que ya no existe se
   devuelve como no disponible; nunca se sustituye silenciosamente por otra fuente.
5. El estado de grabación y los archivos los controla main: solo hay una sesión activa, los chunks
   se escriben en orden y las rutas de reveal/open/delete/rename/get-media-url se restringen a la
   carpeta de salida y a contenedores terminados.
6. FFmpeg se lanza con arreglos de argumentos; nunca se concatena una cadena de shell. Antes de
   ofrecer un formato, códec o acelerador se comprueba con un sondeo y una codificación de prueba reales.
7. `recording:begin` valida el plan contra esas capacidades; una combinación no verificada se rechaza.
8. `RecordingStatus.encoding` informa de los valores realmente obtenidos y de los FPS medidos,
   no solo de los solicitados.
9. El permiso `media` se concede solo para audio: la cámara sigue bloqueada. El loopback del
   sistema lo concede main solo cuando la plataforma y los ajustes lo permiten.
10. Los sidecars se parsean con Zod. Un valor no verificable viaja como `null` con
   `metadataStatus`, nunca como dato cierto; los campos desconocidos se conservan al renombrar.
11. `recording:rename` valida nombre y colisiones antes de tocar el disco, mueve vídeo, pistas y
   sidecar y revierte los cambios si falla. `recording:delete` solo borra las pistas en su ruta
   canónica, aunque el sidecar esté manipulado.
12. `recording:get-media-url` solo acepta archivos terminados dentro de la carpeta. El esquema
   privado `openscreen-media://` se valida de nuevo en main antes de servir cualquier byte.
13. `recording:cleanup-temp` elimina únicamente temporales gestionados huérfanos; nunca toca los
   de la sesión en curso. La interfaz pide el nombre exacto antes de borrar una grabación.

Para añadir un canal, sigue los pasos de [CONTRIBUTING.md](../CONTRIBUTING.md).
