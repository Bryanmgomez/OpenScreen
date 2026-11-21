# services/audio

**Estado: implementado y verificado en Windows (Sesión 05).**

- `AudioService` consulta a `systemPreferences` el permiso real de micrófono y declara las
  capacidades del sistema operativo. Windows reporta `systemAudio: available` porque se capturó un
  tono real desde el escritorio con `loopbackWithMute` y la pista Opus/WebM resultante contenía
  audio (RMS 0,081). macOS y Linux reportan `unavailable`: no se presenta como compatible una
  captura del sistema que no se ha probado en esas plataformas.
- `resolveSystemAudioGrant` decide, con los ajustes guardados, si el handler de captura puede
  conceder `loopback` o `loopbackWithMute`. En macOS y Linux solo se ofrece el modo «dispositivo
  virtual» elegido por el usuario; OpenScreen no simula la captura del sistema.
- La enumeración de dispositivos y los medidores viven en el renderer (`src/audio`), porque
  dependen de `getUserMedia`, `enumerateDevices` y Web Audio API. Main nunca inventa un
  dispositivo ni un nivel.
