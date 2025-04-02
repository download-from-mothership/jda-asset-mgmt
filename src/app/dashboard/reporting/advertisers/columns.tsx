'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Advertiser } from './types'
import { formatCurrency } from '@/lib/utils'

export const columns: ColumnDef<Advertiser>[] = [
  {
    accessorKey: 'name',
    header: 'Advertiser Name',
  },
  {
    accessorKey: 'total_campaigns',
    header: 'Total Campaigns',
  },
  {
    accessorKey: 'active_campaigns',
    header: 'Active Campaigns',
  },
  {
    accessorKey: 'total_spend',
    header: 'Total Spend',
    cell: ({ row }) => formatCurrency(row.getValue('total_spend')),
  },
  {
    accessorKey: 'affiliate_data.clicks',
    header: 'Clicks',
    cell: ({ row }) => {
      const clicks = row.original.affiliate_data?.clicks
      return clicks !== undefined ? clicks.toLocaleString() : '-'
    },
  },
  {
    accessorKey: 'affiliate_data.conversions',
    header: 'Conversions',
    cell: ({ row }) => {
      const conversions = row.original.affiliate_data?.conversions
      return conversions !== undefined ? conversions.toLocaleString() : '-'
    },
  },
  {
    accessorKey: 'affiliate_data.conversion_rate',
    header: 'Conversion Rate',
    cell: ({ row }) => {
      const rate = row.original.affiliate_data?.conversion_rate
      return rate !== undefined ? `${rate.toFixed(2)}%` : '-'
    },
  },
  {
    accessorKey: 'last_campaign_date',
    header: 'Last Campaign',
    cell: ({ row }) => {
      const date = row.getValue('last_campaign_date') as string
      return date ? new Date(date).toLocaleDateString() : 'N/A'
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return new Date(date).toLocaleDateString()
    },
  },
] 