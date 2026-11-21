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

- **FFmpeg (Sesión 06):** OpenScreen no incluye ningún binario. La detección de códecs y formatos
  solo habilita lo que el FFmpeg instalado por el usuario prueba en su equipo; H.265/AV1/NVENC/AMF/QSV
  no se afirman sin prueba real. Antes de distribuir un binario hay que decidir LGPL vs GPL según los
  componentes y revisar patentes de H.264/H.265 y licencias de los codificadores de hardware.
- **Electron / Chromium:** el binario incluye componentes de terceros con sus propias licencias (`LICENSES.chromium.html`); deben incluirse en el instalador.
