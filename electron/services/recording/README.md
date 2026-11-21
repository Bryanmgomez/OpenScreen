# services/recording

**Estado: implementado (Sesión 04).**

Responsabilidad: máquina de estados de la grabación, prevención de grabaciones duplicadas,
control de archivos temporales, finalización del contenedor y recuperación ante interrupciones.

## Reparto con el renderer

- `recordingStore.ts` (renderer) es dueño de `getDisplayMedia` y `MediaRecorder`. Capta el stream
  real de la fuente seleccionada y envía los chunks a main por `recording:append-chunk`.
- `recordingService.ts` (main) es la autoridad: valida la fuente contra `CaptureService`, reserva
  la sesión, crea el archivo `.part`, escribe los chunks en orden, cierra el contenedor, escribe
  metadatos de duración y publica `recording:status-changed`.
- `ffmpegService.ts` solo interviene cuando se elige MP4. Ejecuta FFmpeg real con un array de
  argumentos y gestiona errores y timeouts. No se añade ninguna dependencia npm falsa.

## Archivos

- Nombre automatic saneado desde `fileNameTemplate` (`{source}`, `{date}`, `{time}`, `{ext}`).
- Temporales: `<nombre>.webm.part` (o `.mp4.part`) y `<nombre>.ffmpeg.part` durante la transcodificación.
- Finalización: `rename()` atómico al nombre definitivo; si falla, se limpia y el estado pasa a `error`.
- Metadatos: `<nombre>.openscreen.json` con duración y MIME type para la biblioteca.

## Decisiones

- WebM nativo es el formato por defecto: no requiere binarios externos.
- MP4 usa FFmpeg porque Chromium no garantiza `MediaRecorder` MP4 en todas las plataformas.
- La calidad se controla con bitrate de vídeo en `MediaRecorder` y con CRF en FFmpeg.
- Los ids de `desktopCapturer` no son permanentes: si la fuente guardó caducado, `begin()` falla
  en lugar de grabar otra cosa.

## Pruebas

- `tests/recordingModel.test.ts`: naming, rutas, MIME types, bitrates y argumentos de FFmpeg.
- `tests/recordingService.test.ts`: integración con archivos reales en `tmpdir`: chunks ordenados,
  duplicados, pausas, cancelación, MP4 con FFmpeg simulado, `dispose()` y contención de rutas.
