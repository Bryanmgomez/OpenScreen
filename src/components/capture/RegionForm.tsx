import { useEffect, useState, type FormEvent } from 'react'
import { Scan } from 'lucide-react'
import type { CaptureRegion } from '@shared/capture'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'

interface RegionFormProps {
  region: CaptureRegion | null
  busy: boolean
  onSave: (region: CaptureRegion) => Promise<void>
}

const EMPTY_REGION: CaptureRegion = { x: 0, y: 0, width: 1280, height: 720 }

type Field = keyof CaptureRegion

const FIELDS: readonly { key: Field; label: string }[] = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'width', label: 'Ancho' },
  { key: 'height', label: 'Alto' }
]

/** Base del selector de región: se guarda la geometría real; la captura llega en la Fase 4. */
export function RegionForm({ region, busy, onSave }: RegionFormProps) {
  const [values, setValues] = useState<CaptureRegion>(region ?? EMPTY_REGION)

  useEffect(() => {
    setValues(region ?? EMPTY_REGION)
  }, [region])

  const valid =
    Number.isInteger(values.x) &&
    Number.isInteger(values.y) &&
    Number.isInteger(values.width) &&
    Number.isInteger(values.height) &&
    values.x >= 0 &&
    values.y >= 0 &&
    values.width > 0 &&
    values.height > 0

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (valid) void onSave(values)
  }

  return (
    <Panel
      title="Región personalizada"
      icon={<Scan size={15} />}
      action={region ? <Badge tone="accent">Región guardada</Badge> : undefined}
    >
      <form className="region-form" onSubmit={submit}>
        <p className="panel__note">
          Puedes guardar las coordenadas de la zona a capturar. El recorte real se activará en la
          siguiente fase; mientras tanto, la grabación usa la fuente seleccionada.
        </p>
        <div className="region-form__fields">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="field">
              <span className="field__label">{label}</span>
              <input
                className="region-form__input"
                type="number"
                min={key === 'width' || key === 'height' ? 1 : 0}
                step={1}
                value={values[key]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
        </div>
        <Button type="submit" variant="primary" disabled={busy || !valid}>
          Guardar región
        </Button>
      </form>
    </Panel>
  )
}
