# services/encoding

**Estado: implementado y verificado de forma limitada (Sesión 06).**

Responsabilidad: decidir y ejecutar la codificación cuando `MediaRecorder` no puede producir
directamente el formato, códec o parámetros elegidos.

## Qué hace

- `encodingProbe.ts` consulta a un FFmpeg real (`-version`, `-encoders`, `-formats`, `-hwaccels`) y
  hace una codificación de prueba de un frame contra `/null` por cada codificador. Un encoder
  listado pero inutilizable se marca como no disponible. La presencia de una GPU no prueba
  NVENC/AMF/QSV.
- `ffmpegService.ts` lanza FFmpeg con `spawn()` y un array de argumentos: la ruta del binario nunca
  se interpreta como comando de shell. Registra los procesos hijos activos, aplica un timeout de
  15 minutos a las transcodificaciones y permite terminarlos solo desde main.
- `model.ts` construye los argumentos y los planes de codificación. WebM nativo sigue siendo la ruta
  por defecto; MKV puede reenvolver el WebM sin recodificar y MP4 o los ajustes avanzados requieren
  transcodificación real.
- `src/encoding/mediaRecorderProbe.ts` comprueba por escritura real los MIME soportados por
  `MediaRecorder`; `isTypeSupported()` por sí solo no habilita una opción.

## Límites honestos

FFmpeg/ffprobe no están incluidos en la aplicación ni instalados en el entorno de desarrollo.
Por eso MP4/MKV, H.265, AV1 y la aceleración por hardware permanecen deshabilitados con su motivo
hasta que una prueba real en la máquina del usuario los valide. Las opciones no verificadas nunca
se presentan como compatibles.
