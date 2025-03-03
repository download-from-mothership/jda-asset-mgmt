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
import { ArrowUpDown, ChevronDown, MoreHorizontal, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Toaster, toast } from "sonner"

import { Button } from "@/components/ui/button"
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

type TollFree = {
  id: number
  did: string
  sender_id: number
  sender: {
    sender: string
  }
  status_id: number
  status: {
    status: string
  }
  provider_id: number
  provider: {
    provider: string
  }
  campaignid_tcr: string | null
  use_case: string | null
  brief: string | null
  submitteddate: string | null
  notes: string | null
}

export default function TollFreePage() {
  const [data, setData] = React.useState<TollFree[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [briefContent, setBriefContent] = React.useState<{ id: number, content: string } | null>(null)

  const fetchTollFree = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: tollFreeData, error: tollFreeError } = await supabase
        .from('toll_free')
        .select(`
          *,
          sender (
            sender
          ),
          status (
            status
          ),
          provider (
            provider
          )
        `)
        .order('submitteddate', { ascending: false })

      if (tollFreeError) {
        throw new Error(tollFreeError.message)
      }

      setData(tollFreeData || [])
    } catch (error) {
      console.error('Error fetching toll-free numbers:', error)
      setError(error instanceof Error ? error.message : 'Failed to load toll-free numbers')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTollFree()
  }, [fetchTollFree])

  const handleSaveChanges = React.useCallback(async () => {
    if (briefContent) {
      try {
        const { error: updateError } = await supabase
          .from('toll_free')
          .update({ brief: briefContent.content })
          .eq('id', briefContent.id)
        
        if (updateError) {
          throw updateError
        }
        
        toast.success('Changes saved successfully')
        await fetchTollFree()
        setBriefContent(null)
      } catch (error) {
        console.error('Error updating brief:', error)
        toast.error('Failed to save changes')
      }
    }
  }, [briefContent, fetchTollFree])

  const columns = React.useMemo<ColumnDef<TollFree>[]>(() => [
    {
      accessorKey: "sender.sender",
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
    },
    {
      accessorKey: "did",
      header: "DID",
    },
    {
      accessorKey: "status.status",
      header: "Status",
    },
    {
      accessorKey: "provider.provider",
      header: "Provider",
    },
    {
      accessorKey: "campaignid_tcr",
      header: "Campaign ID TCR",
    },
    {
      accessorKey: "use_case",
      header: "Use Case",
    },
    {
      accessorKey: "brief",
      header: "Brief",
      cell: ({ row }) => {
        const brief = row.getValue("brief") as string | null
        const isSelected = briefContent?.id === row.original.id

        return (
          <div className="flex items-center gap-2">
            {brief ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([brief], { type: 'text/plain' })
                    const url = window.URL.createObjectURL(blob)
                    window.open(url, '_blank')
                    window.URL.revokeObjectURL(url)
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Brief
                </Button>
              </div>
            ) : (
              <>
                <Input
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      try {
                        const content = await file.text()
                        setBriefContent({ id: row.original.id, content })
                        toast.info('Click Save Changes to update the brief')
                      } catch (error) {
                        toast.error('Failed to read file')
                      }
                    }
                  }}
                  className="max-w-xs"
                />
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveChanges}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBriefContent(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "submitteddate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Submitted Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("submitteddate") as string
        return date ? new Date(date).toLocaleDateString() : null
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const navigate = useNavigate()
        const tollFree = row.original

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
                onClick={() => navigator.clipboard.writeText(tollFree.did)}
              >
                Copy DID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/dashboard/maintenance/toll-free/${tollFree.id}`)}>
                Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [briefContent, handleSaveChanges])

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
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
    <div className="container mx-auto py-10">
      <Toaster />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Toll-Free Numbers</h1>
        <div className="rounded-lg border">
          <div className="flex items-center py-4 px-4 gap-2">
            <Input
              placeholder="Filter by sender..."
              value={(table.getColumn("sender.sender")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("sender.sender")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Input
              placeholder="Filter by DID..."
              value={(table.getColumn("did")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("did")?.setFilterValue(event.target.value)
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
          <div className="flex items-center justify-end space-x-2 py-4 px-4">
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
    </div>
  )
} 