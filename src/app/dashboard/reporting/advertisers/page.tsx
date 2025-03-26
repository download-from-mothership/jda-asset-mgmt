'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { columns } from './columns'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Advertiser {
  id: number
  name: string
  total_campaigns: number
  active_campaigns: number
  total_spend: number
  last_campaign_date: string
  created_at: string
}

export default function AdvertisersPage() {
  const { data: advertisers, isLoading, error } = useQuery({
    queryKey: ['advertisers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisers')
        .select(`
          id,
          name,
          total_campaigns,
          active_campaigns,
          total_spend,
          last_campaign_date,
          created_at
        `)
        .order('name')

      if (error) throw error
      return data as Advertiser[]
    }
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error loading advertisers</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Advertisers Report</CardTitle>
          <CardDescription>
            Overview of all advertisers and their campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={advertisers || []} />
        </CardContent>
      </Card>
    </div>
  )
} 