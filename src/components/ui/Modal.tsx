import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/** Modal sobre <dialog> nativo: trampa de foco, Esc y bloqueo del fondo los da el navegador. */
export function Modal({ open, title, onClose, footer, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
    >
      <header className="modal__header">
        <h2 className="modal__title">{title}</h2>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </header>
      <div className="modal__body">{children}</div>
      {footer && <footer className="modal__footer">{footer}</footer>}
    </dialog>
  )
}
