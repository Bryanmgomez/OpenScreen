import { useEffect } from 'react'
import { translate, type MessageKey } from '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'

/** Devuelve la función de traducción asociada al idioma persistido. */
export function useI18n(): { language: 'es' | 'en'; t: (key: MessageKey) => string } {
  const language = useSettingsStore((state) => state.settings?.general.language ?? 'es')

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return { language, t: (key) => translate(language, key) }
}
