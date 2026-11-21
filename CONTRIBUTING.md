# Guía de contribución

Gracias por querer ayudar a OpenScreen. Este documento resume cómo trabajar en el proyecto.

## Preparar el entorno

```bash
npm install
npm run dev
```

Antes de abrir un pull request ejecuta:

```bash
npm run typecheck
npm test
npm run build
```

## Principios del proyecto

1. **Nada decorativo.** No se añaden botones sin función ni datos simulados para aparentar funcionalidades. Lo que no está implementado se marca como pendiente, indicando la fase.
2. **Separación de responsabilidades.** El renderer nunca accede a Node ni a Electron directamente; todo pasa por el preload y por canales IPC validados.
3. **Sin lógica duplicada.** Lo que comparten main, preload y renderer (canales, esquemas, tipos) vive en `shared/`.
4. **TypeScript estricto.** Sin `any` implícitos; los tipos de la API se definen en `shared/api.ts`.
5. **Decisiones documentadas.** Si tomas una decisión técnica relevante, anótala en `docs/`.
6. **No afirmar lo que no se probó.** No declares que algo funciona en un sistema operativo si no lo has ejecutado en él.

## Cómo añadir un canal IPC

1. Añade el nombre en `shared/channels.ts`.
2. Si recibe datos, define su esquema zod en `shared/` y su tipo.
3. Añade el método al contrato `OpenScreenApi` en `shared/api.ts`.
4. Registra el manejador en `electron/main/ipc/` usando `handle(canal, esquema, función)`; así se valida el origen y el argumento automáticamente.
5. Expón el método en `electron/preload/index.ts`.
6. Usa la API desde el renderer a través de `src/services/ipc.ts`.
7. Añade pruebas de la validación.

## Estilo

- Formato según `.editorconfig` (2 espacios, LF).
- Nombres de archivos de componentes en `PascalCase.tsx`; utilidades y hooks en `camelCase.ts`.
- Textos de interfaz en español (los paquetes de idiomas llegarán más adelante).

## Dependencias nuevas

Antes de añadir una dependencia evalúa su mantenimiento, rendimiento, seguridad y que su licencia sea compatible con GPL-3.0 (MIT, ISC, BSD y Apache-2.0 lo son). Regístrala en `docs/dependencies.md`. No se aceptan dependencias propietarias.

## Licencia de las contribuciones

Al contribuir aceptas que tu aportación se distribuya bajo GPL-3.0-only.
