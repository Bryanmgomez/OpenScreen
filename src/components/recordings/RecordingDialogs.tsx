import { useEffect, useState } from 'react'
import {
  normalizedRecordingName,
  validateRecordingName
} from '@shared/recording'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { RecordingItem } from '@/types/recording'

interface DialogProps {
  recording: RecordingItem | null
  onClose: () => void
}

export function RenameDialog({
  recording,
  onClose,
  onConfirm
}: DialogProps & { onConfirm: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(recording?.name ?? '')
    setSaving(false)
  }, [recording])

  const problem = recording ? validateRecordingName(name, recording.format) : null
  const normalized = recording && !problem ? normalizedRecordingName(name) : null

  const submit = async (): Promise<void> => {
    if (!recording || problem || !normalized) return
    setSaving(true)
    try {
      await onConfirm(normalized)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={recording !== null}
      title="Renombrar grabación"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={Boolean(problem) || saving}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="rename-input">Nombre del archivo</label>
        <input
          id="rename-input"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="field__hint">
          Se renombran también las pistas de audio y el sidecar de metadatos.
        </span>
        {problem && <span className="notice notice--error">{problem}</span>}
        {normalized && normalized !== name && (
          <span className="field__hint">Se guardará como «{normalized}».</span>
        )}
      </div>
    </Modal>
  )
}

export function DeleteDialog({
  recording,
  onClose,
  onConfirm
}: DialogProps & { onConfirm: () => Promise<void> }) {
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setConfirmation('')
    setSaving(false)
  }, [recording])

  const matches = Boolean(recording && confirmation === recording.name)

  const submit = async (): Promise<void> => {
    if (!matches) return
    setSaving(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={recording !== null}
      title="Eliminar grabación"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="danger" onClick={() => void submit()} disabled={!matches || saving}>
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      <p className="notice notice--error">
        Esta acción no se puede deshacer. Se borrarán el vídeo, sus pistas de audio y sus metadatos.
      </p>
      <div className="field">
        <label className="field__label" htmlFor="delete-confirm">
          Escribe <strong>{recording?.name}</strong> para confirmar
        </label>
        <input
          id="delete-confirm"
          className="input"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={recording?.name}
        />
      </div>
    </Modal>
  )
}
