"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Vertical = {
  vertical_name: string
}

type SenderWithVerticals = {
  id: number
  sender: string
  shorturl: string | null
  brand: string | null
  company: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cta: string | null
  terms: string | null
  privacypolicy: string | null
  lastmodified: string
  modified_by: string | null
  modified_by_name: string | null
}

export type Sender = SenderWithVerticals & {
  verticals: string[]
}

export const columns: ColumnDef<Sender>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "sender",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sender
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.getValue("sender")}</div>,
  },
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => <div>{row.getValue("brand") || "-"}</div>,
  },
  {
    accessorKey: "shorturl",
    header: "Short URL",
    cell: ({ row }) => <div>{row.getValue("shorturl") || "-"}</div>,
  },
  {
    accessorKey: "verticals",
    header: "Vertical",
    cell: ({ row }) => {
      const verticals = row.getValue("verticals") as string[]
      return (
        <div className="flex flex-wrap gap-1">
          {verticals?.length > 0 ? (
            verticals.map((vertical, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
              >
                {vertical}
              </span>
            ))
          ) : (
            "-"
          )}
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const verticals = row.getValue(id) as string[]
      return verticals.some(v => 
        v.toLowerCase().includes((value as string).toLowerCase())
      )
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => <div>{row.getValue("company") || "-"}</div>,
    filterFn: (row, id, value) => {
      const company = row.getValue(id) as string
      return company?.toLowerCase().includes((value as string).toLowerCase()) ?? false
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => <div>{row.getValue("city") || "-"}</div>,
  },
  {
    accessorKey: "state",
    header: "State",
    cell: ({ row }) => <div>{row.getValue("state") || "-"}</div>,
  },
  {
    accessorKey: "zip",
    header: "ZIP",
    cell: ({ row }) => <div>{row.getValue("zip") || "-"}</div>,
  },
  {
    accessorKey: "lastmodified",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Modified
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("lastmodified"))
      return <div>{date.toLocaleString()}</div>
    },
  },
  {
    accessorKey: "modified_by_name",
    header: "Modified By",
    cell: ({ row }) => <div>{row.getValue("modified_by_name") || "-"}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const sender = row.original
      const navigate = useNavigate()

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(sender.id.toString())}
            >
              Copy sender ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View sender details</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/dashboard/maintenance/update?id=${sender.id}`)}>
              Edit sender
            </DropdownMenuItem>
            {sender.shorturl && (
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(sender.shorturl!)}
              >
                Copy short URL
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

type VerticalQueryResult = {
  sender_id: number
  vertical: Vertical | null
}

export function SenderTable() {
  const [data, setData] = React.useState<Sender[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "sender", desc: false }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    lastmodified: false,
    modified_by_name: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})

  React.useEffect(() => {
    const fetchSenders = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // First get all senders
        const { data: senders, error: sendersError } = await supabase
          .from('sender')
          .select('*')
          .order('sender', { ascending: true })

        if (sendersError) {
          console.error('Supabase error:', sendersError)
          throw new Error(sendersError.message)
        }

        // Then get all verticals for these senders
        const { data: verticalData, error: verticalError } = await supabase
          .from('sender_vertical')
          .select(`
            sender_id,
            vertical:vertical_id (
              vertical_name
            )
          `)
          .in('sender_id', (senders || []).map(s => s.id)) as {
            data: VerticalQueryResult[] | null
            error: any
          }

        if (verticalError) {
          console.error('Error fetching verticals:', verticalError)
          throw new Error(verticalError.message)
        }

        // Create a map of sender_id to vertical names
        const verticalsBySender = new Map<number, string[]>()
        
        verticalData?.forEach(item => {
          const senderId = item.sender_id
          const verticalName = item.vertical?.vertical_name

          if (verticalName) {
            if (!verticalsBySender.has(senderId)) {
              verticalsBySender.set(senderId, [])
            }
            verticalsBySender.get(senderId)?.push(verticalName)
          }
        })

        // Combine sender data with their verticals
        const sendersWithVerticals = (senders || []).map(sender => ({
          ...sender,
          verticals: verticalsBySender.get(sender.id as number) || []
        })) as Sender[]

        setData(sendersWithVerticals)
      } catch (error) {
        console.error('Error fetching senders:', error)
        setError(error instanceof Error ? error.message : 'Failed to load senders. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchSenders()
  }, [])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        <Input
          placeholder="Filter by sender..."
          value={(table.getColumn("sender")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("sender")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by vertical..."
          value={(table.getColumn("verticals")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("verticals")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Input
          placeholder="Filter by company..."
          value={(table.getColumn("company")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("company")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
} 