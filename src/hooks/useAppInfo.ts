import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/api'
import { getApi } from '@/services/ipc'
import { toMessage } from '@/utils/errors'

interface AppInfoState {
  info: AppInfo | null
  error: string | null
}

/** Información del entorno, pedida una sola vez al proceso main por IPC. */
export function useAppInfo(): AppInfoState {
  const [state, setState] = useState<AppInfoState>({ info: null, error: null })

  useEffect(() => {
    let active = true
    getApi()
      .app.getInfo()
      .then((info) => active && setState({ info, error: null }))
      .catch((error: unknown) => active && setState({ info: null, error: toMessage(error) }))
    return () => {
      active = false
    }
  }, [])

  return state
}
