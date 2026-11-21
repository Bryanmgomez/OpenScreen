import { useEffect, useState } from 'react'
import { getApi } from '@/services/ipc'

/** Estado de maximizado de la ventana, sincronizado con los eventos del proceso main. */
export function useWindowMaximized(): boolean {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const api = getApi().window
    let active = true
    api
      .isMaximized()
      .then((value) => active && setMaximized(value))
      .catch(() => undefined)
    const unsubscribe = api.onMaximizedChange(setMaximized)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return maximized
}
