import { HelpCircle } from 'lucide-react'

type Props = {
  content: string
}

export default function InfoTooltip({ content }: Props) {
  return (
    <span className="relative inline-flex group/tooltip cursor-help">
      <HelpCircle
        size={16}
        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs leading-relaxed text-foreground bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none text-right">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-popover" />
      </span>
    </span>
  )
}
