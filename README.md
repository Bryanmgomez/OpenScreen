# OpenScreen

Grabador de pantalla de escritorio, moderno y de código abierto, construido con Electron, React, TypeScript y Vite.
Nombre provisional del proyecto. Licencia **GNU GPL-3.0-only**.

> **Estado: Fase 1 (Fundación) completada.** La aplicación arranca, tiene interfaz, navegación, ajustes persistentes y un sistema IPC seguro, **pero todavía no graba**. La captura llega en la Fase 2. Ver [Hoja de ruta](#hoja-de-ruta).

## Qué funciona hoy

- Aplicación Electron con ventana sin marco y barra de título propia (minimizar, maximizar/restaurar, cerrar).
- Interfaz en React con navegación: Inicio, Grabación, Grabaciones y Ajustes.
- Tema oscuro (por defecto), claro y «sistema», y opción de reducir animaciones. Se guardan en disco y sobreviven a reinicios.
- Información real del entorno (versiones, plataforma, carpeta de datos) obtenida del proceso main por IPC.
- Seguridad de Electron aplicada (ver [docs/security.md](docs/security.md)).
- Pruebas automáticas de ajustes, persistencia y seguridad.

Lo que **no** existe todavía (y está marcado como tal en la propia interfaz): captura de pantalla, audio, codificación con FFmpeg, biblioteca de grabaciones y atajos.

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
| 2 | Captura: monitores, ventanas, región, vista previa, grabación básica | Siguiente |
| 3 | Audio: micrófono, audio del sistema, dispositivos, pistas | Planificada |
| 4 | Codificación: FFmpeg, formatos, calidad, aceleración por hardware | Planificada |
| 5 | Gestión: biblioteca, reproducción, historial, ajustes completos | Planificada |
| 6 | Distribución: instaladores, GitHub Releases, pruebas multiplataforma | Planificada |

## Estado de las pruebas

- Pruebas unitarias (`npm test`) y comprobación de tipos: pasan.
- Compilación de producción: funciona.
- Arranque real de la aplicación: verificado en **Linux (Xvfb)** durante el desarrollo de la Fase 1.
- **Windows: aún no verificado por el autor de esta fase.** Hay que ejecutar `npm run dev` y `npm run dist:win` en Windows antes de dar la Fase 1 por cerrada en esa plataforma.
- Linux y macOS: no son objetivo de la primera versión; la arquitectura no lo impide.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Las dependencias y sus licencias están en [docs/dependencies.md](docs/dependencies.md).

## Licencia

GNU General Public License v3.0 solo (`GPL-3.0-only`). Texto completo en [LICENSE](LICENSE).
