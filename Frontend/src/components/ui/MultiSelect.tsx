import { ReactNode } from 'react'

interface MultiSelectOption {
  value: string
  label: string
  description?: ReactNode
}

interface MultiSelectProps {
  label?: string
  value: string[]
  options: MultiSelectOption[]
  onChange: (values: string[]) => void
  disabled?: boolean
  helperText?: string
  emptyText?: string
}

export function MultiSelect({ label, value, options, onChange, disabled = false, helperText, emptyText = 'No options available' }: MultiSelectProps) {
  const toggleValue = (optionValue: string) => {
    if (disabled) return
    const exists = value.includes(optionValue)
    const next = exists ? value.filter((item) => item !== optionValue) : [...value, optionValue]
    onChange(next)
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <div
        className={`
          rounded-lg border border-slate-700/60 bg-slate-900/40
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {options.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-500">{emptyText}</div>
        ) : (
          <div className="flex flex-wrap gap-2 px-3 py-2">
            {options.map((option) => {
              const selected = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  disabled={disabled}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                    ${selected ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40' : 'bg-slate-800/60 text-slate-300 border-slate-700/70 hover:border-slate-600'}
                  `}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {helperText && <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>}
    </div>
  )
}

