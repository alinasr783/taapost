import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

type State = {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
          <div className="text-4xl" aria-hidden>⚠️</div>
          <h1 className="text-lg font-bold">حدث خطأ غير متوقع</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            واجه الموقع مشكلة أثناء التحميل. قد يكون السبب ضعف الاتصال بالإنترنت.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[5px] border border-input bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            إعادة المحاولة
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
