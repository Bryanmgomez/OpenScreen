# services/recording

**Estado: implementado (Sesión 04), con codificación verificada en la Sesión 06.**

Responsabilidad: máquina de estados de la grabación, prevención de grabaciones duplicadas,
control de archivos temporales, finalización del contenedor y recuperación ante interrupciones.

## Reparto con el renderer

- `recordingStore.ts` (renderer) es dueño de `getDisplayMedia` y `MediaRecorder`. Capta el stream
  real de la fuente seleccionada y envía los chunks a main por `recording:append-chunk`.
- `recordingService.ts` (main) es la autoridad: valida la fuente contra `CaptureService`, reserva
  la sesión, crea el archivo `.part`, escribe los chunks en orden, cierra el contenedor, escribe
  metadatos de duración y publica `recording:status-changed`.
- `ffmpegService.ts` interviene cuando el plan requiere FFmpeg (MP4, MKV con parámetros, códecs
  o aceleración no nativos). Ejecuta FFmpeg real con un array de argumentos y gestiona errores y
  timeouts. No se añade ninguna dependencia npm falsa.
- `encodingProbe.ts` sondea `-version`, `-encoders`, `-formats`, `-hwaccels` y hace una codificación
  de prueba por codificador; un encoder listado pero inutilizable no se ofrece. La GPU por sí sola
  no prueba NVENC/AMF/QSV.

## Archivos

- Nombre automatic saneado desde `fileNameTemplate` (`{source}`, `{date}`, `{time}`, `{ext}`).
- Temporales: `<nombre>.webm.part` (o `.mp4.part`) y `<nombre>.ffmpeg.part` durante la transcodificación.
- Finalización: `rename()` atómico al nombre definitivo; si falla, se limpia y el estado pasa a `error`.
- Metadatos: `<nombre>.openscreen.json` con duración, MIME type, pistas y `EncodingPlan` aplicado.

## Decisiones

- WebM nativo es el formato por defecto: no requiere binarios externos y se elige solo si el
  MIME fue verificado escribiendo un archivo real.
- MP4/MKV, códecs alternativos y aceleración usan FFmpeg solo cuando el sondeo y la prueba real
  lo confirman; una combinación no verificada se rechaza en `begin()`.
- La calidad se controla con bitrate de vídeo en `MediaRecorder` y con CRF/bitrate o preset en
  FFmpeg. MKV puede reenvueltar el WebM sin recodificar (`streamCopy`).
- `getDisplayMedia` se pide antes de cualquier IPC en `start()` para conservar la activación del
  gesto; resolución y FPS se reducen a lo que la fuente entrega y se informa de los FPS medidos.
- Los ids de `desktopCapturer` no son permanentes: si la fuente guardó caducado, `begin()` falla
  en lugar de grabar otra cosa.

## Pruebas

- `tests/recordingModel.test.ts`: naming, rutas, MIME types, bitrates y argumentos de FFmpeg.
- `tests/recordingService.test.ts`: integración con archivos reales en `tmpdir`: chunks ordenados,
  duplicados, pausas, cancelación, MP4 con FFmpeg simulado, `dispose()` y contención de rutas.
- `tests/encodingModel.test.ts` y `tests/encodingProbe.test.ts`: degradación honesta de
  resolución/FPS, planes verificados, parseo de la salida real de FFmpeg y rechazo de encoders
  que no pasan la prueba.
- Verificación real: 720p/24 fps VP9 WebM, 1280×720, 23,7 fps medidos, EBML válido y plan guardado.
