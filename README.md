# OpenScreen

Grabador de pantalla de escritorio, moderno y de código abierto, construido con Electron, React, TypeScript y Vite.
Nombre provisional del proyecto. Licencia **GNU GPL-3.0-only**.

> **Estado: Fase 5 completada (Sesión 07).** La aplicación detecta fuentes reales, graba con audio y codificación verificada, y ofrece una biblioteca funcional para encontrar, reproducir y administrar las grabaciones. Ver [Hoja de ruta](#hoja-de-ruta).

## Qué funciona hoy

- Aplicación Electron con ventana sin marco y barra de título propia (minimizar, maximizar/restaurar, cerrar).
- Interfaz en React con navegación: Inicio, Grabación, Grabaciones y Ajustes.
- Tema oscuro (por defecto), claro y «sistema», y opción de reducir animaciones. Se guardan en disco y sobreviven a reinicios.
- Información real del entorno (versiones, plataforma, carpeta de datos) obtenida del proceso main por IPC.
- **Detección de fuentes reales**: monitores (resolución, DPI, frecuencia, principal) y ventanas, con miniatura e icono cuando el sistema los proporciona. La lista se actualiza al conectar pantallas y mediante sondeo de ventanas.
- **Selección de fuente** persistida y revalidada: si la ventana o el monitor desaparece, la interfaz lo indica en lugar de grabar otra cosa.
- **Vista previa real** de la fuente elegida (el mismo `MediaStream` que se usa al grabar).
- **Grabación real** con `MediaRecorder`: inicio, pausa, reanudación y parada; temporizador que descuenta las pausas e indicador de grabación activa.
- **Archivos finalizados**: chunks en orden, WebM nativo o MP4/MKV mediante FFmpeg real solo cuando el sondeo y la prueba lo permiten, nombres saneados, temporales `.part` y sidecar `.openscreen.json` con valores reales.
- **Biblioteca de grabaciones real**: miniaturas de fotogramas decodificados, nombre, fecha, duración, tamaño, resolución y FPS verificados; reproductor integrado, revelado, renombrado, borrado con confirmación, orden, filtros, estado de almacenamiento y limpieza de temporales.
- Base de región personalizada (guardado de coordenadas; el recorte efectivo sigue pendiente).
- Seguridad de Electron aplicada (ver [docs/security.md](docs/security.md)).
- Pruebas automáticas de ajustes, persistencia, seguridad, mapeo de fuentes, modelo de grabación y servicio de grabación con archivos reales.

Lo que **no** existe todavía (y se indica en la interfaz): recorte efectivo de región, atajos globales y distribución. La aceleración por hardware y los formatos MP4/MKV solo se ofrecen si FFmpeg y la combinación elegida pasan una prueba real; FFmpeg no se distribuye con la aplicación. El audio automático del sistema está verificado solo en Windows; macOS/Linux requieren un dispositivo virtual elegido por el usuario.

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`
- npm 10+
- Windows 10/11 x64 (plataforma prioritaria)

## Instalación y ejecución

```bash
git clone https://github.com/Norvyz/OpenScreen.git
cd OpenScreen
npm install
npm run dev
```

`npm install` descarga el binario de Electron. Si falla detrás de un proxy o firewall, define `ELECTRON_MIRROR` o revisa la [documentación de Electron](https://www.electronjs.org/docs/latest/tutorial/installation).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Inicia la app en desarrollo con recarga en caliente |
| `npm run build` | Compila main, preload y renderer en `out/` |
| `npm run preview` | Ejecuta la compilación de `out/` |
| `npm run typecheck` | Comprueba tipos (proceso Node y renderer) |
| `npm test` | Ejecuta las pruebas con Vitest |
| `npm run dist:dir` | Empaqueta sin instalador en `dist/` (para pruebas locales) |
| `npm run dist:win` | Genera el instalador de Windows (NSIS) en `dist/` |

## Estructura

```
OpenScreen/
├── electron/
│   ├── main/            # Proceso main: ventana, seguridad, registro de IPC
│   │   ├── ipc/
│   │   └── security/
│   ├── preload/         # Puente contextBridge → window.openscreen
│   └── services/        # Servicios por dominio (capture, audio, recording, encoding, storage, settings)
├── shared/              # Contratos compartidos: canales IPC, esquemas zod, tipos de la API
├── src/                 # Renderer (React)
│   ├── components/  pages/  hooks/  services/  store/  types/  utils/  styles/
├── resources/           # Iconos e imágenes
├── docs/                # Documentación técnica
└── tests/
```

Se añadió `shared/` respecto a la propuesta inicial: main, preload y renderer necesitan los mismos canales y esquemas, y tenerlos en un único lugar evita duplicar lógica. Detalles en [docs/architecture.md](docs/architecture.md).

## Hoja de ruta

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Fundación: proyecto, IPC, seguridad, interfaz base | ✅ Completada |
| 2 | Captura: monitores, ventanas, región, vista previa, grabación básica | ✅ Completada |
| 3 | Audio: micrófono, audio del sistema, dispositivos, pistas | ✅ Completada (Sesión 05) |
| 4 | Codificación: FFmpeg, formatos, calidad, aceleración por hardware | ✅ Completada con capacidades verificadas (Sesión 06) |
| 5 | Gestión: biblioteca, reproducción, historial, ajustes completos | ✅ Completada (Sesión 07) |
| 6 | Distribución: instaladores, GitHub Releases, pruebas multiplataforma | Siguiente |

## Estado de las pruebas

- Pruebas unitarias y de integración (`npm test`, **80 pruebas en 13 archivos**), comprobación de tipos y compilación de producción: pasan.
- **Prueba real de grabación (Sesión 04, Windows):** se arrancó la app compilada con Electron 45, se seleccionó un monitor real, se grabó con pausa/reanudación y se obtuvo un WebM válido (cabecera EBML `1a45dfa3`) en la carpeta configurada.
- **Prueba real de audio (Sesión 05):** se capturaron micrófono y loopback del sistema con pistas Opus independientes y se decodificaron; el tono de 440 Hz se registró con RMS 0,081.
- **Prueba real de codificación (Sesión 06):** WebM VP9 1280×720, 24 fps aplicados y 23,7 fps medidos; un plan a 60 fps informó 39,6 fps medidos y la interfaz lo mostró como diferencia, no como logro.
- **Prueba real de biblioteca (Sesión 07):** el artefacto WebM anterior (792.611 bytes, 3,19 s) se lista con metadataStatus `ok`, resolución y cadencia del sidecar; la URL privada se valida en main. Si el archivo no está en la máquina, esa prueba se omite.
- FFmpeg/ffprobe no están instalados en el entorno de desarrollo: MP4/MKV, H.265, AV1 y aceleración por GPU permanecen deshabilitados y no se presentan como compatibles. Linux y macOS no se afirman como plataformas verificadas.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Las dependencias y sus licencias están en [docs/dependencies.md](docs/dependencies.md).

## Licencia

GNU General Public License v3.0 solo (`GPL-3.0-only`). Texto completo en [LICENSE](LICENSE).
