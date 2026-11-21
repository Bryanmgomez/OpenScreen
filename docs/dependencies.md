# Dependencias y licencias

OpenScreen se distribuye bajo **GPL-3.0-only**. Las licencias de la tabla son las declaradas en el `package.json` de cada paquete instalado. MIT, ISC y Apache-2.0 son compatibles con GPL-3.0.

## Ejecución

| Paquete | Versión | Licencia | Uso |
| --- | --- | --- | --- |
| react / react-dom | 19.3.1 | MIT | Interfaz |
| react-router-dom | 7.18.6 | MIT | Navegación |
| zustand | 5.1.0 | MIT | Estado del renderer |
| zod | 4.6.7 | MIT | Validación de IPC y ajustes |
| lucide-react | 1.77.0 | ISC | Iconos |

## Desarrollo y empaquetado

| Paquete | Versión | Licencia |
| --- | --- | --- |
| electron | 45.4.1 | MIT |
| electron-vite | 6.0.0 | MIT |
| vite | 8.3.8 | MIT |
| @vitejs/plugin-react | 6.3.0 | MIT |
| electron-builder | 26.18.0 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.1.1 | MIT |
| @types/node, @types/react, @types/react-dom | — | MIT |

Las dependencias transitivas no se han auditado una por una en la Fase 1. Antes de publicar una versión (Fase 6) hay que generar el inventario completo de licencias del paquete distribuido.

## Pendiente de revisar

- **FFmpeg (Fase 4):** definir cómo se distribuirá. Las compilaciones de FFmpeg pueden ser LGPL o GPL según los componentes habilitados, y los codificadores de hardware y de H.264/H.265 pueden tener implicaciones de patentes o de licencia. Se documentará la decisión en este archivo antes de incluir ningún binario.
- **Electron / Chromium:** el binario incluye componentes de terceros con sus propias licencias (`LICENSES.chromium.html`); deben incluirse en el instalador.
