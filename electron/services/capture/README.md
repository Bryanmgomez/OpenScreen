# services/capture

**Estado: implementado (Sesión 03).** Detecta y expone fuentes reales de captura.

## Responsabilidad

- `captureService.ts`: usa `desktopCapturer` para enumerar pantallas y ventanas, `screen` para
  los monitores (resolución, DPI, frecuencia, principal) y `systemPreferences` para el permiso
  de captura. Emite `capture:sources-changed` cuando cambia una pantalla o, mediante sondeo
  cada 5 s, cuando cambia una ventana (Electron no notifica aperturas/cierres de ventanas).
- `model.ts`: funciones puras de mapeo. Convierten `NativeImage` a data URL, enriquecen cada
  fuente con su monitor, descartan fuentes sin id/nombre y calculan los avisos por plataforma.
  No importan Electron, así que se prueban con vitest en Node.

## Selección real

`session.defaultSession.setDisplayMediaRequestHandler` (configurado en `electron/main/index.ts`)
concede el `MediaStream` exactamente a la fuente elegida. `getDisplayMedia` no permite elegir
por `deviceId` según la especificación, por eso la decisión se toma en main.

Los ids de `desktopCapturer` **no son permanentes**: la selección se guarda como referencia en
ajustes y se revalida en cada instantánea (`selectionAvailable`). Si la fuente desapareció, la
interfaz lo indica y pide elegir otra; nunca se captura una fuente distinta de la seleccionada.

## Diferencias por plataforma

- **Windows:** `displayFrequency` y `display_id` suelen estar disponibles; se solicitan iconos
  de ventana (`fetchWindowIcons`). El permiso `screen` siempre se reporta como concedido.
- **macOS:** hace falta consentimiento de grabación de pantalla (10.15+); las ventanas
  protegidas pueden carecer de miniatura o no aparecer. Se comprueba con
  `systemPreferences.getMediaAccessStatus('screen')`.
- **Linux:** con PipeWire puede devolverse una sola fuente y combinarse ventanas/pantallas.
  No se consulta el estado de permiso porque la API no está soportada.

La región personalizada guarda su geometría. El motor de grabación (Sesión 04) ya usa la fuente
seleccionada; el recorte efectivo a esas coordenadas sigue pendiente de una fase posterior.
