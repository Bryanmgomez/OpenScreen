# Arquitectura

## Procesos

```
┌─────────────────────────┐   contextBridge    ┌──────────────────────────┐
│ Renderer (React, sandbox)│ ◄───────────────► │ Preload (window.openscreen)│
└─────────────────────────┘                    └────────────┬─────────────┘
                                                             │ ipcRenderer.invoke / on
                                                ┌────────────▼─────────────┐
                                                │ Main (Node, Electron)     │
                                                │  ipc/  security/  window  │
                                                │  services/*               │
                                                └──────────────────────────┘
```

- **Main** (`electron/main`): ciclo de vida de la app, ventana, seguridad de sesión y registro de IPC. No contiene lógica de negocio; la delega en `electron/services/*`.
- **Preload** (`electron/preload`): expone una API mínima y tipada. No se incluyen módulos de Node.
- **Renderer** (`src`): interfaz React. Solo conoce la API de `window.openscreen`, a través de `src/services/ipc.ts`.
- **Shared** (`shared`): canales IPC, esquemas zod y tipos de la API. Es el contrato entre procesos.

## Servicios

| Servicio | Estado | Fase |
| --- | --- | --- |
| `settings` | Implementado (JSON en `userData`, escritura atómica y serializada) | 1 |
| `capture` | Implementado: fuentes reales, selección revalidada, eventos y vista previa (Sesión 03) | 2 |
| `recording` | Implementado: motor, audio, codificación verificada y biblioteca (Sesión 07) | 2 |
| `audio` | Implementado: pistas reales, permisos y loopback de Windows verificado (Sesión 05) | 3 |
| `encoding` | Implementado: planes y capacidades probadas, FFmpeg con arrays de args (Sesión 06) | 4 |
| `storage` | Implementado: metadatos, miniaturas, reproducción y administración de archivos (Sesión 07) | 5 |
| `system` | Implementado: preferencias de arranque, bandeja, atajos globales, notificaciones y diagnóstico (Sesión 08) | 6 |

Los servicios no dependen directamente de Electron cuando es posible (p. ej. `SettingsService` recibe la ruta del archivo), lo que permite probarlos de forma aislada.

## Decisiones técnicas

### Carpeta `shared/` (desvío de la propuesta inicial)
La propuesta no la incluía. Se añadió porque los tres procesos necesitan los mismos canales y esquemas; duplicarlos habría provocado desajustes silenciosos.

### electron-vite
Gestiona de una sola vez los tres objetivos de compilación (main, preload, renderer) con Vite y recarga en caliente del renderer. El preload se empaqueta con todas sus dependencias (`externalizeDeps: false`) porque el sandbox solo permite `require('electron')`. Main mantiene sus dependencias externas (`zod`), que electron-builder incluye en el paquete.

### HashRouter
En producción la interfaz se carga desde `file://`, donde el enrutado por historial no funciona. `HashRouter` evita necesitar un protocolo personalizado.

### Ajustes: Main es la fuente de verdad
El store de Zustand en el renderer solo refleja lo que main confirma. Main valida cada actualización con zod y notifica a todas las ventanas.

### Ventana sin marco
La barra de título es propia para lograr un diseño coherente. Está pensada para Windows; los controles de ventana de macOS se revisarán con la distribución multiplataforma (Fase 7).

### Zustand + CSS propio
Se evitó una librería de componentes o Tailwind para no sumar dependencias. Los tokens de diseño están como variables CSS en `src/styles/global.css`.

### Sin icono de aplicación todavía
`electron-builder` usará el icono por defecto de Electron hasta que se añada `resources/icons/icon.ico` (Fase 7). El logotipo actual (`resources/icons/logo.svg`) es provisional. La bandeja usa un PNG de 16×16 generado en `main/trayIcon.ts`, sin recursos externos.

## Cómo encajarán las fases siguientes

- **Captura (2, completada):** la Sesión 03 enumera fuentes con `desktopCapturer`/`screen`, permite elegirlas y muestra vista previa real. La Sesión 04 añade el motor: el renderer capta con `MediaRecorder` y main es dueño del estado, de los chunks y de los archivos. `setDisplayMediaRequestHandler` concede exactamente la fuente elegida; si caducó, la grabación se rechaza.
- **Audio (3, completado en la Sesión 05):** mezcla y medidores con Web Audio API en el renderer; dispositivos y permisos coordinados desde main. El `loopback` de Windows se verificó con audio real; macOS/Linux requieren un dispositivo virtual no verificado por OpenScreen.
- **Codificación (4, completada en la Sesión 06):** FFmpeg se ejecuta como proceso hijo desde main
  con arreglos de argumentos. La calidad, resolución, FPS, formato, códec y aceleración se deciden
  con capacidades detectadas y probadas; nunca con listas supuestas. WebM sigue siendo la ruta
  nativa sin dependencias. Las opciones no verificadas aparecen deshabilitadas y con el motivo.
- **Configuración y rendimiento (6, completada en la Sesión 08):** las preferencias se amplían con
  arranque, idioma, atajos, notificaciones y diagnóstico. Main aplica los efectos del sistema y el
  renderer refleja el estado real; nada se activa si la plataforma o el permiso no lo permiten.

## Interfaz (Sesión 02)

- **Componentes reutilizables** en `src/components/ui`: `Button`, `IconButton`, `Select`, `Switch`, `SegmentedControl`, `Card`, `Panel`, `Modal` (sobre `<dialog>` nativo), `StatusIndicator`, `Badge`, `EmptyState` y `SideNav` (por rutas o por estado).
- **Sin controles ficticios**: el antiguo catálogo de controles pendientes se retiró al conectar cada ajuste. Una opción no verificada aparece deshabilitada y con el motivo real, nunca con un valor inventado.
- **Grabaciones**: `useRecordings()` expone los archivos reales devueltos por `recording:list`; en la Sesión 07 añade miniaturas, metadatos verificados, URL de reproducción y acciones de renombrado y limpieza.
- **Galería** (`/#/design`): solo existe con `npm run dev`. Sus datos son de ejemplo y no aparecen en producción.
- El panel de Inicio sustituye a las tarjetas de «funciones planificadas»; la hoja de ruta pasó a Ajustes > General.

## Interfaz (Sesión 03)

- `src/pages/RecordingPage.tsx` muestra monitores y ventanas reales, con miniatura, resolución,
  frecuencia y badge de principal. La selección se persiste como referencia en ajustes.
- `SourcePreview` pide el `MediaStream` mediante `getDisplayMedia`; main concede la fuente
  elegida. No es una imagen de ejemplo.
- `RegionForm` permite guardar coordenadas; el recorte efectivo se implementará con el motor
  de grabación. La interfaz lo indica expresamente para no simular funcionalidad.
- `useCaptureStore` refleja instantáneas de main; se suscribe antes de leer para no perder
  cambios producidos durante el arranque.

## Motor de grabación (Sesión 04)

- `electron/services/recording/model.ts`: lógica pura (nombres, extensiones, transiciones,
  bitrates, argumentos de FFmpeg y contención de rutas). No importa Electron.
- `electron/services/recording/recordingService.ts`: dueño del estado y de los archivos. Solo
  permite una sesión activa, escribe chunks en orden, finaliza el contenedor, publica eventos y
  limpia temporales al cancelar, fallar o salir.
- `electron/services/recording/ffmpegService.ts`: lanzamiento real de FFmpeg con argumentos en
  array; solo se usa para MP4 (o futuras transcodificaciones). No hay dependencia npm decorativa.
- `src/store/recordingStore.ts`: gestiona `getDisplayMedia` y `MediaRecorder` en el renderer,
  pero no decide el estado: main confirma cada transición. El temporizador y el indicador activo
  se derivan del estado de main.
- Ajustes persistentes añadidos en `shared/settings.ts`: carpeta de salida, cursor, calidad,
  formato, plantilla de nombre y ruta opcional de FFmpeg. Las adiciones usan `.catch` por campo;
  la sesión 08 elevó `schemaVersion` a 2 al añadir `general`, `shortcuts` y `performance`.
- Verificación real: la app compilada grabó un monitor físico con pausa/reanudación y produjo un
  WebM reproducible con cabecera EBML válida, listado después por la biblioteca.

## Audio (Sesión 05)

- `shared/audio.ts`: contrato estricto de dispositivos, ajustes, permisos, capacidades y pistas.
  `volume` es ganancia lineal y `muted` se traduce a ganancia 0.
- `electron/services/audio/AudioService`: consulta el permiso real de micrófono con
  `systemPreferences` y publica capacidades. Windows declara `systemAudio: available` porque se
  verificó con audio real; macOS/Linux declaran `unavailable` y no simulan captura del sistema.
- `resolveSystemAudioGrant`: concede `loopback`/`loopbackWithMute` solo en Windows, con la pista
  activa y el modo automático; macOS/Linux requieren un dispositivo virtual elegido por el usuario.
- `src/audio/audioEngine.ts`: `getUserMedia` para micrófono/dispositivo virtual, pista de audio del
  sistema desde el handler de main, `GainNode`/`AnalyserNode` para volumen, silencio y niveles, y
  `MediaRecorder` por fuente para Opus/WebM independiente. Las pistas independientes se crean solo
  cuando llega el primer chunk, sin temporales vacíos.
- `RecordingService`: escribe y valida los chunks de audio por separado, informa de desconexiones y
  guarda cada pista como `<nombre>.microphone.webm` / `<nombre>.system.webm`. FFmpeg puede unirlas
  en un único contenedor con `-map` por entrada (sin duplicar la pista mezclada del vídeo).
- Ajustes persistentes: micrófono y sistema con dispositivo, volumen, mute, modo (`auto`/`device`),
  `muteOnCapture` y `separateTracks`. La interfaz los expone en Ajustes > Audio y en el mezclador
  de la página de grabación.
- La eliminación de una grabación borra también sus pistas y metadatos; la biblioteca no muestra los
  archivos de audio sueltos como si fueran vídeos.

### Verificación real de audio (Windows 11, Electron 45.4.1)

Se grabó la pantalla completa con el mezclador activo mientras se reproducía un tono de 440 Hz y
se decodificaron los archivos escritos por la app:

| Archivo | Duración | RMS | Pico | Resultado |
| --- | --- | --- | --- | --- |
| `<nombre>.webm` (vídeo) | 3,07 s | — | — | Cabecera EBML `1a45dfa3`, 1,6 MB |
| `<nombre>.microphone.webm` | 2,94 s | 0,001 | 0,018 | Audio real del dispositivo (ruido ambiente; nadie habló) |
| `<nombre>.system.webm` | 2,94 s | 0,081 | 0,315 | Tono de 440 Hz capturado desde el escritorio |

El loopback se concedió con `loopbackWithMute`, por lo que el tono no se repitió en la salida. Las
tres pistas se listan en los metadatos y ningún archivo `.part` quedó tras finalizar. macOS y Linux
no se presentan como compatibles: la captura automática allí requiere un dispositivo virtual no
probado por OpenScreen.

## Calidad y codificación (Sesión 06)

- `shared/encoding.ts`: contrato único de resolución (original/720p/1080p/1440p/4K), FPS
  (24/30/48/60/120), formatos (WebM/MP4/MKV), códecs (H.264/H.265/AV1/VP8/VP9), calidad
  (Baja/Media/Alta/Personalizada), aceleración (CPU/NVENC/AMF/QSV), perfiles y `EncodingPlan`.
  `Media` es la etiqueta de `balanced`; `custom` permite bitrate, CRF, keyframe y preset.
- `src/encoding/mediaRecorderProbe.ts`: prueba real de escritura `MediaRecorder` para cada MIME
  candidato (genera un archivo diminuto y valida la cabecera EBML/`ftyp`). `isTypeSupported()`
  por sí solo nunca marca una opción como compatible. El sondeo usa 10 frames/~800 ms porque VP9
  puede tardar en emitir el primer chunk.
- `electron/services/recording/encodingProbe.ts`: sondeo real de FFmpeg (`-version`, `-encoders`,
  `-formats`, `-hwaccels`) y una codificación de prueba de un frame contra `/null` por codificador.
  Un encoder listado pero inutilizable se marca como no disponible. La presencia de una GPU no se
  considera prueba de NVENC/AMF/QSV.
- `src/encoding/model.ts`: construye el plan final. Reduce resolución/FPS a lo que la fuente
  realmente entrega, mide frames con `requestVideoFrameCallback`, degrada un códec persistido no
  verificado a otro verificado y elige la ruta nativa solo cuando no hay recodificación. MKV puede
  reenvolver el WebM sin pérdida (`streamCopy`); MP4 y los ajustes avanzados requieren transcode.
  Todo lo que no pasó una prueba real se rechaza con un motivo, no se ofrece como compatible.
- `src/components/recording/EncodingSettings.tsx`: panel compartido por la página de grabación y
  Ajustes > Video. Muestra las opciones no disponibles deshabilitadas y explica por qué.
  Los perfiles guardan y aplican únicamente la combinación actual de ajustes.
- `getDisplayMedia` sigue siendo la primera operación asíncrona de `start()`: cualquier IPC previo
  consume la activación transitoria del gesto. Las constraints se piden como `ideal`; se comprueban
  `getSettings()` y los frames entregados antes de informar del resultado.
- `RecordingStatus.encoding` y el archivo `.openscreen.json` incluyen el plan aplicado con tamaño
  y FPS reales y los FPS medidos. Un `frameRate` reflejado por Chromium no se presenta como logrado
  si la entrega real fue menor.

### Verificación real (Windows 11, Electron 45.4.1)

- FFmpeg/ffprobe no están instalados en el entorno de desarrollo: MP4, MKV, H.265, AV1 y
  aceleración por GPU quedan deshabilitados y no se afirman como compatibles.
- Grabación real con 720p/24 fps y VP9: archivo WebM de 792.611 bytes, cabecera EBML `1a45dfa3`,
  duración 3,19 s, fuente `1920×1080` y plan `1280×720`, 24 fps
  aplicados y 23,7 fps medidos. El plan guardado coincidió con los valores informados.
- Segunda grabación real a 1080p/60 fps con VP9: `actualFps: 60` pero `measuredFps: 39,6`; la
  interfaz avisó de la diferencia en lugar de presentar 60 fps como tiempo real obtenido.
- El sondeo de `MediaRecorder` verificó por escritura real VP8, VP9, AV1, MP4 AVC/AV1 y
  Matroska H.264. Las peticiones de 4K/120 fps sobre una fuente 1080p60 se degradan y se avisa.

## Biblioteca y almacenamiento (Sesión 07)

- `shared/recording.ts` define `RecordingLibrarySnapshot` y el esquema versionado del sidecar
  `.openscreen.json`. `list`, `delete`, `rename` y `cleanupTemp` devuelven siempre el mismo tipo:
  elementos, carpeta, disponibilidad, temporales, error y marca de tiempo.
- **Nada se inventa**: duración, MIME, pistas y `EncodingPlan` se leen con Zod. Si el sidecar
  falta, está corrupto o no aporta datos verificables, el campo queda `null`, `metadataStatus`
  vale `missing`/`invalid` y la interfaz muestra «Desconocido». Un sidecar antiguo sin `version`
  sigue siendo legible; los campos desconocidos se conservan al renombrar.
- `RecordingService` comprueba la carpeta con `stat`, `access(W_OK)` y un archivo de sondeo real;
  `statfs` aporta el espacio libre como dato informativo. La ruta de cada operación se resuelve y
  se restringe a la carpeta configurada; un sidecar manipulado no puede ampliar un borrado ni un
  renombrado a rutas arbitrarias.
- `rename` valida el nombre en main y renderer, rechaza colisiones antes de tocar el disco y mueve
  vídeo, pistas canónicas y sidecar. Si falla, restaura el sidecar original byte a byte y revierte
  las pistas ya movidas. `delete` pide confirmar escribiendo el nombre exacto en la interfaz.
- `cleanupTempFiles()` elimina solo `.part` gestionados por OpenScreen y omite los de la sesión
  activa (vídeo, transcodificación y pistas de audio).
- `electron/main/mediaProtocol.ts` registra `openscreen-media://` antes de `ready` y sirve el archivo
  real con `protocol.handle`, validando esquema, host, contención de ruta, extensión y existencia.
  Soporta rangos de bytes para que el navegador pueda buscar en el vídeo; responde con CORS para
  que el `<canvas>` pueda capturar un fotograma sin contaminarse. No se desactiva `webSecurity`.
- `src/services/thumbnailService.ts` decodifica el vídeo en un `<video>` oculto, captura un
  fotograma real y lo cachea por ruta; si el contenedor no se puede decodificar, la tarjeta muestra
  su marcador en lugar de una imagen inventada.
- `VideoPlayerModal` opera el `<video>` real: reproducir/pausar, ±10 s, barra de progreso, volumen,
  silencio y duración obtenida del propio elemento. `filterAndSortRecordings()` es una función pura
  que filtra por texto/formato/periodo y ordena por fecha/nombre/duración/tamaño; lo desconocido
  siempre queda al final.

### Verificación real (Sesión 07)

- El artefacto real `OpenScreen-20261120-232338.webm` (792.611 bytes, cabecera EBML `1a45dfa3`)
  se lista con `durationMs: 3190`, `metadataStatus: ok`, VP9, 1280×720, 24 fps aplicados y
  23,7 fps medidos. Si el archivo no existe en otra máquina, la prueba se omite en lugar de
  sustituirse por datos de ejemplo.
- `npm test`: 80 pruebas en esa sesión; `npm run typecheck` y `npm run build`: correctos. La CSP
  compilada incluye `openscreen-media:` solo en `media-src`.

## Preferencias, atajos y diagnóstico (Sesión 08)

- `shared/settings.ts` pasa a `schemaVersion: 2`. `general`, `shortcuts` y `performance` se leen con
  valores por defecto por campo, por lo que un archivo de la versión 1 conserva lo que sí era válido.
  Los parches recibidos por IPC siguen siendo estrictos y rechazan claves desconocidas.
- `shared/shortcuts.ts` concentra la lógica pura: alias de modificadores, teclas admitidas,
  combinaciones reservadas, detección de duplicados y conversión de eventos de teclado. La interfaz
  captura la combinación con `keydown`, rechaza colisiones antes de guardar y muestra el estado real.
- `SystemService` aplica tema nativo, inicio con el sistema (solo app empaquetada en Windows/macOS),
  bandeja y registro de `globalShortcut`. Crea la bandeja cuando existe una ventana que puede quedar
  oculta (`minimizeOnClose` o `startMinimized`). «Salir» pasa por `before-quit` para no omitir la
  limpieza de captura, atajos, FFmpeg y archivos.
- El atajo de micrófono se entrega al renderer como un evento tipado y usa el mismo
  `updateTrack('microphone', ...)` que el mezclador: respeta el permiso y el flujo de error ya
  existentes en Web Audio. Los demás atajos reutilizan las mismas acciones que los botones.
- `shared/system.ts` define capacidades, hardware, consumo, errores y recursos. Lo que no se pudo
  medir viaja como `null` o `supported: false` con motivo. El panel de rendimiento consulta el
  diagnóstico cada pocos segundos y permite liberar cachés y procesos FFmpeg gestionados solo si no
  hay grabación activa.
- `FfmpegService` mantiene un registro real de procesos hijos activos y los termina solo desde main
  al salir o al liberar recursos. `RecordingService` aporta contadores reales de grabaciones,
  manejadores abiertos y temporales gestionados; no se muestran ceros simulados.
- `src/i18n` añade un diccionario tipado español/inglés sin dependencias nuevas. Cubre navegación y
  ajustes; el resto de la interfaz permanece en español y la opción lo indica expresamente.
- `npm test`: 96 pruebas en 15 archivos; `npm run typecheck` y `npm run build`: correctos. Las
  integraciones de Electron (bandeja, registro real de atajos, login item y notificaciones) no se
  simulan: su disponibilidad se consulta en tiempo de ejecución y se muestra con su motivo.
