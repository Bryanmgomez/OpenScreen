import { useId } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  options: readonly SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  hideLabel?: boolean
  /** Valores detectados como no compatibles; se muestran pero no se pueden elegir. */
  disabledOptions?: readonly string[]
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  hideLabel = false,
  disabledOptions = []
}: SelectProps) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field__label'}>
        {label}
      </label>
      <select
        id={id}
        className="select"
        disabled={disabled}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={disabledOptions.includes(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
