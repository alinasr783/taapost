declare module 'react-quill-new' {
  import type { ComponentType, Ref } from 'react'
  import type Quill from 'quill'

  export interface ReactQuillInstance {
    getEditor(): Quill
  }

  export interface ReactQuillProps {
    ref?: Ref<ReactQuillInstance>
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    placeholder?: string
    readOnly?: boolean
    modules?: Record<string, unknown>
    formats?: string[]
    theme?: string
    className?: string
    style?: React.CSSProperties
  }

  const ReactQuill: ComponentType<ReactQuillProps>
  export default ReactQuill
}
