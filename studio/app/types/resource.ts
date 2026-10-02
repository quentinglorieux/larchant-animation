export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'markdown' | 'date' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'file' | 'm2o'
  half?: boolean
  required?: boolean
  help?: string
  options?: { value: string, label: string }[]
  refCollection?: string
  refLabelKey?: string
  placeholder?: string
}
export type Row = Record<string, unknown>
export interface ColumnDef {
  key: string
  header: string
  type?: 'image' | 'badge' | 'date' | 'boolean' | 'text' | 'state'
  state?: (row: Row) => { label: string, color: string } | null
}
