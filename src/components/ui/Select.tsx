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
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  hideLabel = false
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
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
