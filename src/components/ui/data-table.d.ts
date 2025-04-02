import { ColumnDef } from '@tanstack/react-table'

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
}

export const DataTable: <TData>(props: DataTableProps<TData>) => JSX.Element 