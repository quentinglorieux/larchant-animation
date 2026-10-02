export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'markdown' | 'date' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'file' | 'm2o' | 'm2m'
  half?: boolean
  required?: boolean
  help?: string
  options?: { value: string, label: string }[]
  refCollection?: string
  refLabelKey?: string
  /** m2o/m2m : champs à lire et libellé calculé, quand refLabelKey ne suffit pas (ex. « Festi'Baleine 2026 »). */
  refFields?: string[]
  refLabel?: (row: Row) => string
  /** m2m : champ de la collection de jonction qui pointe vers refCollection (ex. evenements_id). */
  junctionField?: string
  placeholder?: string
}
export type Row = Record<string, unknown>
export interface ColumnDef {
  key: string
  header: string
  type?: 'image' | 'badge' | 'date' | 'boolean' | 'text' | 'state'
  /** boolean : interrupteur modifiable directement dans le tableau. */
  editable?: boolean
  state?: (row: Row) => { label: string, color: string } | null
}
