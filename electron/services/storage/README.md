# services/storage

**Estado: implementado en la Sesión 07 dentro del servicio de grabación.**

Responsabilidad real: comprobar la carpeta de destino (existencia, permisos y espacio libre),
mantener la biblioteca de grabaciones y gestionar los archivos temporales huérfanos. No existe un
servicio independiente con estado propio: `RecordingService` es la autoridad y
`main/mediaProtocol.ts` sirve los vídeos terminados al reproductor.

## Qué hace

- `getStorageInfo()` resuelve la carpeta configurada, comprueba `stat`, `access(W_OK)` y una
  escritura de sondeo real; `statfs` informa del espacio libre sin presentarlo como garantía.
- `list()`, `delete()`, `rename()` y `cleanupTempFiles()` devuelven un `RecordingLibrarySnapshot`
  único: elementos, carpeta, disponibilidad, temporales, error y marca de tiempo.
- El sidecar `.openscreen.json` se parsea con Zod. Si falta o no es válido, la duración, la
  resolución y los FPS se informan como desconocidos, nunca como valores supuestos.
- `rename()` mueve vídeo, pistas y sidecar, rechaza colisiones y restaura el estado anterior si
  falla. `delete()` borra solo las pistas en sus rutas canónicas.
- `cleanupTempFiles()` elimina únicamente `.part` gestionados por OpenScreen y respeta los de la
  sesión activa.

Toda ruta recibida del renderer se valida en main y se restringe a la carpeta de grabaciones
resuelta. Las miniaturas y el reproductor usan `openscreen-media://`, un esquema privado que solo
sirve contenedores terminados de esa carpeta.
