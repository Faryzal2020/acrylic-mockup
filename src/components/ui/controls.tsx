import { ChevronDown, ChevronRight } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useRuntimeStore } from '../../store/runtimeStore'

/* -------------------------------------------------------------- Section -- */

export function Section({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="section">
      <button
        type="button"
        className="section__header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="section__chevron" aria-hidden>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {title}
        {badge != null && <span className="section__count">{badge}</span>}
      </button>
      {open && <div className="section__body">{children}</div>}
    </section>
  )
}

/* ---------------------------------------------------------------- Field -- */

export function Field({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value?: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="field">
      <div className="field__label">
        <span>{label}</span>
        {value != null && <span className="field__value">{value}</span>}
      </div>
      {children}
      {hint != null && <p className="field__hint">{hint}</p>}
    </div>
  )
}

/* --------------------------------------------------------------- Slider -- */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  precision = 0,
  disabled,
  hint,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  precision?: number
  disabled?: boolean
  hint?: ReactNode
  onChange: (value: number) => void
}) {
  const nudge = useRuntimeStore((s) => s.nudgeInteraction)
  return (
    <Field label={label} value={`${value.toFixed(precision)}${unit}`} hint={hint}>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          // Dropping render quality while a slider is dragged keeps the
          // preview responsive; it settles back to full ~300ms after release.
          nudge()
          onChange(Number(event.target.value))
        }}
      />
    </Field>
  )
}

/* ---------------------------------------------------- SegmentedControl --- */

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  hint,
  onChange,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  hint?: ReactNode
  onChange: (value: T) => void
}) {
  const control = (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented__option${
            option.value === value ? ' segmented__option--active' : ''
          }`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
  return label ? (
    <Field label={label} hint={hint}>
      {control}
    </Field>
  ) : (
    control
  )
}

/* --------------------------------------------------------------- Toggle -- */

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <label className="toggle" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={`toggle__track${checked ? ' toggle__track--on' : ''}`} aria-hidden>
        <span className="toggle__knob" />
      </span>
    </label>
  )
}

/* ----------------------------------------------------------- ColorField -- */

const HEX = /^#[0-9a-f]{6}$/i

export function ColorField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: string
  hint?: ReactNode
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <Field label={label} hint={hint}>
      <div className="color-field">
        <input
          className="color-field__swatch"
          type="color"
          value={value}
          aria-label={`${label} swatch`}
          onChange={(event) => {
            setDraft(event.target.value)
            onChange(event.target.value)
          }}
        />
        <input
          className="color-field__hex"
          type="text"
          value={draft === value || HEX.test(draft) ? draft : value}
          spellCheck={false}
          aria-label={`${label} hex value`}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            if (HEX.test(next)) onChange(next)
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </Field>
  )
}

/* --------------------------------------------------------------- Button -- */

export function Button({
  children,
  variant = 'default',
  block,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary'
  block?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      className={[
        'button',
        variant === 'primary' ? 'button--primary' : '',
        block ? 'button--block' : '',
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
