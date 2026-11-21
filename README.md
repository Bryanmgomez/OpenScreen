# OpenScreen

Grabador de pantalla de escritorio, moderno y de código abierto, construido con Electron, React, TypeScript y Vite.
Nombre provisional del proyecto. Licencia **GNU GPL-3.0-only**.

> **Estado: Fase 2 completada (Sesión 04).** La aplicación detecta monitores y ventanas reales, permite seleccionar la fuente y grabarla con inicio, pausa, reanudación y parada reales. Los archivos se finalizan en disco y aparecen en la biblioteca. Ver [Hoja de ruta](#hoja-de-ruta).

## Qué funciona hoy

- Aplicación Electron con ventana sin marco y barra de título propia (minimizar, maximizar/restaurar, cerrar).
- Interfaz en React con navegación: Inicio, Grabación, Grabaciones y Ajustes.
- Tema oscuro (por defecto), claro y «sistema», y opción de reducir animaciones. Se guardan en disco y sobreviven a reinicios.
- Información real del entorno (versiones, plataforma, carpeta de datos) obtenida del proceso main por IPC.
- **Detección de fuentes reales**: monitores (resolución, DPI, frecuencia, principal) y ventanas, con miniatura e icono cuando el sistema los proporciona. La lista se actualiza al conectar pantallas y mediante sondeo de ventanas.
- **Selección de fuente** persistida y revalidada: si la ventana o el monitor desaparece, la interfaz lo indica en lugar de grabar otra cosa.
- **Vista previa real** de la fuente elegida (el mismo `MediaStream` que se usa al grabar).
- **Grabación real** con `MediaRecorder`: inicio, pausa, reanudación y parada; temporizador que descuenta las pausas e indicador de grabación activa.
- **Archivos finalizados**: chunks en orden, contenedor WebM nativo o MP4 mediante FFmpeg real, nombres automáticos saneados, temporales `.part` y metadatos de duración.
- **Biblioteca de grabaciones** conectada a archivos reales: listado, búsqueda, reproducción, revelado y borrado.
- Base de región personalizada (guardado de coordenadas; el recorte efectivo sigue pendiente).
- Seguridad de Electron aplicada (ver [docs/security.md](docs/security.md)).
- Pruebas automáticas de ajustes, persistencia, seguridad, mapeo de fuentes, modelo de grabación y servicio de grabación con archivos reales.

Lo que **no** existe todavía (y está marcado como tal en la propia interfaz): audio, recorte de región, aceleración por hardware y atajos globales.

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
| 3 | Audio: micrófono, audio del sistema, dispositivos, pistas | Siguiente |
| 4 | Codificación: FFmpeg, formatos, calidad, aceleración por hardware | Planificada |
| 5 | Gestión: biblioteca, reproducción, historial, ajustes completos | Planificada |
| 6 | Distribución: instaladores, GitHub Releases, pruebas multiplataforma | Planificada |

## Estado de las pruebas

- Pruebas unitarias y de integración (`npm test`, 49 pruebas) y comprobación de tipos: pasan.
- Compilación de producción (`npm run build`): funciona.
- **Prueba real de grabación (Sesión 04, Windows):** se arrancó la app compilada con Electron 45, se seleccionó un monitor real, se grabó con pausa/reanudación y se obtuvo un WebM válido (cabecera EBML `1a45dfa3`, ~3,1 MB, 5,29 s activos) en la carpeta configurada. La biblioteca lo listó con su duración real.
- La detección de fuentes y el permiso `display-capture` se probaron en esa misma ejecución real. Las limitaciones de cada plataforma están documentadas en `electron/services/capture/README.md`.
- Linux y macOS: no son objetivo de la primera versión; la arquitectura no lo impide.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Las dependencias y sus licencias están en [docs/dependencies.md](docs/dependencies.md).

## Licencia

GNU General Public License v3.0 solo (`GPL-3.0-only`). Texto completo en [LICENSE](LICENSE).
