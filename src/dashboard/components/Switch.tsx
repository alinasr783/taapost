type Props = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
}

export default function Switch({ checked, onCheckedChange, disabled, id, className }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        'inline-flex h-6 w-11 items-center rounded-full border border-border p-0.5 transition-colors',
        checked ? 'bg-primary/25' : 'bg-muted/50',
        checked ? 'justify-end' : 'justify-start',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        className ?? '',
      ].join(' ')}
    >
      <span className="h-5 w-5 rounded-full bg-background shadow-sm transition-transform" />
    </button>
  )
}

