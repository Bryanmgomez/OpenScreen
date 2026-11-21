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
| `recording` | Implementado: estado en main, `MediaRecorder` en renderer, archivos y FFmpeg opcional (Sesión 04) | 2 |
| `audio` | Pendiente | 3 |
| `encoding` | Pendiente | 4 |
| `storage` | Pendiente | 5 |

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
La barra de título es propia para lograr un diseño coherente. Está pensada para Windows; en macOS habrá que revisar los controles de ventana (Fase 6).

### Zustand + CSS propio
Se evitó una librería de componentes o Tailwind para no sumar dependencias. Los tokens de diseño están como variables CSS en `src/styles/global.css`.

### Sin icono de aplicación todavía
`electron-builder` usará el icono por defecto de Electron hasta que se añada `resources/icons/icon.ico` (Fase 6). El logotipo actual (`resources/icons/logo.svg`) es provisional.

## Cómo encajarán las fases siguientes

- **Captura (2, completada):** la Sesión 03 enumera fuentes con `desktopCapturer`/`screen`, permite elegirlas y muestra vista previa real. La Sesión 04 añade el motor: el renderer capta con `MediaRecorder` y main es dueño del estado, de los chunks y de los archivos. `setDisplayMediaRequestHandler` concede exactamente la fuente elegida; si caducó, la grabación se rechaza.
- **Audio (3):** mezcla y medidores con Web Audio API en el renderer; dispositivos y permisos coordinados desde main.
- **Codificación (4):** FFmpeg ya se ejecuta como proceso hijo desde main con arreglos de argumentos cuando se elige MP4. La calidad se controla con CRF (`18`/`23`/`32`). Si `MediaRecorder` no ofrece la fiabilidad requerida para nuevos casos (p. ej. 120 FPS o audio del sistema en Windows), se evaluará una solución nativa complementaria en lugar de simularla.

## Interfaz (Sesión 02)

- **Componentes reutilizables** en `src/components/ui`: `Button`, `IconButton`, `Select`, `Switch`, `SegmentedControl`, `Card`, `Panel`, `Modal` (sobre `<dialog>` nativo), `StatusIndicator`, `PendingTag`, `SideNav` (por rutas o por estado) y `PendingControl`.
- **Controles pendientes**: `src/utils/pendingControls.ts` es el catálogo de controles sin backend. Se muestran deshabilitados, sin valor y con la etiqueta «Pendiente · Fase N». Al implementar una fase, el control se retira del catálogo y se conecta a su ajuste real.
- **Grabaciones**: `useRecordings()` expone los archivos reales devueltos por `recording:list`; `RecordingCard` recibe acciones reales de reproducción, revelado y borrado.
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
  formato, plantilla de nombre y ruta opcional de FFmpeg (`schemaVersion` sigue siendo 1 porque
  las adiciones son compatibles y usan `.catch`).
- Verificación real: la app compilada grabó un monitor físico con pausa/reanudación y produjo un
  WebM reproducible con cabecera EBML válida, listado después por la biblioteca.
