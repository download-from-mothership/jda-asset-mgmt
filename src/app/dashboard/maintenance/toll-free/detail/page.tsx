"use client"

import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { FileText, ArrowLeft } from "lucide-react"

type TollFree = {
  id: number
  did: string
  sender: string
  status_id: number
  status: Status
  provider_id: number
  provider: Provider
  campaignid_tcr: string | null
  use_case: string | null
  brief: string | null
  submitteddate: string | null
  notes: string | null
}

type Status = {
  id: number
  status: string
}

type Provider = {
  providerid: number
  provider_name: string
}

export default function TollFreeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tollFree, setTollFree] = React.useState<TollFree | null>(null)
  const [statuses, setStatuses] = React.useState<Status[]>([])
  const [providers, setProviders] = React.useState<Provider[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch toll-free record
        const { data: tollFreeData, error: tollFreeError } = await supabase
          .from('toll_free')
          .select('*')
          .eq('id', id)
          .single()

        if (tollFreeError) {
          console.error('Error fetching toll-free:', tollFreeError)
          throw tollFreeError
        }

        if (!tollFreeData) {
          throw new Error('Toll-free record not found')
        }

        console.log('Raw toll-free data:', tollFreeData)

        // Verify tables exist
        const { data: tables } = await supabase
          .from('sender_status')
          .select('count')
          .limit(1)

        console.log('Sender status table check:', tables)

        const { data: providerTables } = await supabase
          .from('provider')
          .select('count')
          .limit(1)

        console.log('Provider table check:', providerTables)

        // Get the current status
        const { data: currentStatus, error: currentStatusError } = await supabase
          .from('sender_status')
          .select('id, status')
          .eq('id', tollFreeData.status_id)
          .single()

        if (currentStatusError) {
          console.error('Error fetching current status:', currentStatusError)
        } else {
          tollFreeData.status = currentStatus
        }

        // Get the current provider
        const { data: currentProvider, error: currentProviderError } = await supabase
          .from('provider')
          .select('providerid, provider_name')
          .eq('providerid', tollFreeData.provider_id)
          .single()

        console.log('Current provider query result:', {
          provider_id: tollFreeData.provider_id,
          currentProvider,
          error: currentProviderError
        })

        if (currentProviderError) {
          console.error('Error fetching current provider:', currentProviderError)
        } else {
          tollFreeData.provider = {
            providerid: currentProvider.providerid,
            provider_name: currentProvider.provider_name
          }
        }

        // Fetch all statuses for dropdown
        const { data: allStatusData, error: allStatusError } = await supabase
          .from('sender_status')
          .select('id, status')
          .order('status')

        if (allStatusError) {
          console.error('Error fetching statuses:', allStatusError)
          throw allStatusError
        }

        // Fetch all providers for dropdown
        const { data: providerData, error: providerError } = await supabase
          .from('provider')
          .select('providerid, provider_name')
          .order('provider_name')

        if (providerError) {
          console.error('Error fetching providers:', providerError)
          throw providerError
        }

        console.log('Complete data:', {
          tollFree: tollFreeData,
          currentStatus,
          currentProvider,
          allStatuses: allStatusData,
          allProviders: providerData
        })

        setTollFree(tollFreeData)
        setStatuses(allStatusData || [])
        setProviders(providerData || [])

      } catch (error: any) {
        console.error('Error in fetchData:', error)
        setError(error?.message || error?.toString() || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const formData = new FormData(e.currentTarget)
      const briefFile = (document.getElementById('brief') as HTMLInputElement).files?.[0]
      
      let briefContent = null
      if (briefFile) {
        briefContent = await briefFile.text()
      }

      const updates = {
        status_id: parseInt(formData.get('status_id') as string),
        provider_id: parseInt(formData.get('provider_id') as string),
        campaignid_tcr: formData.get('campaignid_tcr'),
        use_case: formData.get('use_case'),
        brief: briefContent || tollFree?.brief,
        notes: formData.get('notes'),
      }

      const { error } = await supabase
        .from('toll_free')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Changes saved successfully')
      
      // Refresh the data to show updated brief
      const { data: updatedTollFree, error: refreshError } = await supabase
        .from('toll_free')
        .select('*')
        .eq('id', id)
        .single()
        
      if (refreshError) throw refreshError
      setTollFree(updatedTollFree)
    } catch (error) {
      console.error('Error updating toll-free:', error)
      toast.error('Failed to save changes')
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/maintenance/toll-free')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Toll-Free Number</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid gap-6 rounded-lg border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender</Label>
              <Input 
                value={tollFree?.sender || ''} 
                disabled 
                onChange={() => {}}
              />
            </div>
            <div>
              <Label>DID</Label>
              <Input value={tollFree?.did || ''} disabled />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status_id">Status</Label>
                <Select 
                  name="status_id" 
                  value={tollFree?.status_id?.toString()}
                  onValueChange={(value) => {
                    const newTollFree = { ...tollFree }
                    if (newTollFree) {
                      newTollFree.status_id = parseInt(value)
                      newTollFree.status = statuses.find(s => s.id === parseInt(value)) || newTollFree.status
                      setTollFree(newTollFree)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {tollFree?.status?.status || 'Select status'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider_id">Provider</Label>
                <Select 
                  name="provider_id" 
                  value={tollFree?.provider_id?.toString()}
                  onValueChange={(value) => {
                    const newTollFree = { ...tollFree }
                    if (newTollFree) {
                      const selectedProvider = providers.find(p => p.providerid === parseInt(value))
                      newTollFree.provider_id = parseInt(value)
                      newTollFree.provider = selectedProvider || newTollFree.provider
                      setTollFree(newTollFree)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider">
                      {tollFree?.provider?.provider_name || 'Select provider'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.providerid} value={provider.providerid.toString()}>
                        {provider.provider_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignid_tcr">Campaign ID TCR</Label>
              <Input
                id="campaignid_tcr"
                name="campaignid_tcr"
                defaultValue={tollFree?.campaignid_tcr || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="use_case">Use Case</Label>
              <Input
                id="use_case"
                name="use_case"
                defaultValue={tollFree?.use_case || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="brief"
                  name="brief"
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  className="cursor-pointer"
                />
                {tollFree?.brief && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      const blob = new Blob([tollFree.brief], { type: 'text/plain' })
                      const url = window.URL.createObjectURL(blob)
                      window.open(url, '_blank')
                      window.URL.revokeObjectURL(url)
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={tollFree?.notes || ''}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/maintenance/toll-free')}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 