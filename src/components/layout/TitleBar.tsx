import { Copy, Minus, Square, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useWindowMaximized } from '@/hooks/useWindowMaximized'
import { getApi } from '@/services/ipc'

/** Barra de título propia: la ventana no tiene marco nativo. */
export function TitleBar() {
  const maximized = useWindowMaximized()
  const win = getApi().window

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
        <Logo size={18} />
        <span>OpenScreen</span>
      </div>
      <div className="titlebar__controls">
        <button className="winbtn" aria-label="Minimizar" onClick={() => void win.minimize()}>
          <Minus size={16} />
        </button>
        <button
          className="winbtn"
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => void win.toggleMaximize()}
        >
          {maximized ? <Copy size={13} /> : <Square size={12} />}
        </button>
        <button
          className="winbtn winbtn--close"
          aria-label="Cerrar"
          onClick={() => void win.close()}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  )
}
