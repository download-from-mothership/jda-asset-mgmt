"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Advertiser } from "./types"

export default function AdvertisersPage() {
  const { data: advertisers, isLoading, error, refetch } = useQuery({
    queryKey: ['advertisers'],
    queryFn: async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // Fetch advertisers with affiliate data
      const { data: advertisersData, error: advertisersError } = await supabase
        .from('advertisers')
        .select(`
          *,
          affiliate_data:affiliate_reports(
            clicks,
            conversions,
            revenue
          )
        `)
        .eq('affiliate_reports.date', yesterdayStr)

      if (advertisersError) {
        throw new Error(advertisersError.message)
      }

      return (advertisersData || []).map((advertiser: any) => ({
        ...advertiser,
        affiliate_data: advertiser.affiliate_data?.[0] || null
      })) as Advertiser[]
    }
  })

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/refresh-affiliate-data')
      if (!response.ok) {
        throw new Error('Failed to refresh data')
      }
      refetch()
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  if (error) {
    return <div>Error loading advertisers</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-2xl font-bold">Advertisers</h2>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </CardHeader>
        <DataTable
          columns={columns}
          data={advertisers || []}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
} 