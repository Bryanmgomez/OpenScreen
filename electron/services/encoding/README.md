# services/encoding

**Estado: no implementado (Fase 4).**

Responsabilidad prevista: integración con FFmpeg (formatos MP4/MKV/WebM, códecs H.264/H.265/AV1),
detección de codificadores por hardware (NVENC, AMF, Quick Sync) con alternativa por software,
y conversión entre formatos. Los comandos externos se ejecutarán siempre con arreglos de
argumentos (nunca concatenando cadenas de shell).

Pendiente de revisar en esta fase: la distribución de FFmpeg debe ser compatible con GPL-3.0
(ver docs/dependencies.md).
