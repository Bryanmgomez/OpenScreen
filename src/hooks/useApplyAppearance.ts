import { useEffect } from 'react'
import type { Settings } from '@shared/settings'

/** Refleja el tema y la preferencia de animaciones en <html> (los estilos leen data-*). */
export function useApplyAppearance(appearance: Settings['appearance'] | undefined): void {
  const theme = appearance?.theme
  const reduceMotion = appearance?.reduceMotion

  useEffect(() => {
    if (theme === undefined) return
    const root = document.documentElement
    root.dataset['motion'] = reduceMotion ? 'reduced' : 'full'

    if (theme !== 'system') {
      root.dataset['theme'] = theme
      return
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      root.dataset['theme'] = query.matches ? 'dark' : 'light'
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme, reduceMotion])
}
