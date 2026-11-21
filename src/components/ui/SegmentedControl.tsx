interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value?: T
  options: readonly Option<T>[]
  onChange?: (value: T) => void
  label: string
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false
}: SegmentedControlProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={disabled}
          className="segmented__option"
          onClick={() => onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
