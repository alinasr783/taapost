import { AlertTriangle, RotateCw } from 'lucide-react'

type Props = {
  message?: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export default function QueryError({
  message = 'تعذّر تحميل البيانات. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.',
  onRetry,
  isRetrying = false,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-[5px] border border-border/60 bg-card/50 p-8 text-center ${className}`}
    >
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 rounded-[5px] border border-input bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          <RotateCw className={isRetrying ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {isRetrying ? 'جاري المحاولة…' : 'حاول مرة أخرى'}
        </button>
      )}
    </div>
  )
}
