"use client"

import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
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
  sender_id: number
  sender: {
    sender: string
  }
  status_id: number
  status: {
    id: number
    status: string
  }
  provider_id: number
  provider: {
    id: number
    provider: string
  }
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
  id: number
  provider: string
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
          .select(`
            *,
            sender (
              sender
            ),
            status (
              id,
              status
            ),
            provider (
              id,
              provider
            )
          `)
          .eq('id', id)
          .single()

        if (tollFreeError) throw tollFreeError
        setTollFree(tollFreeData)

        // Fetch statuses
        const { data: statusData, error: statusError } = await supabase
          .from('status')
          .select('*')
          .order('status')

        if (statusError) throw statusError
        setStatuses(statusData)

        // Fetch providers
        const { data: providerData, error: providerError } = await supabase
          .from('provider')
          .select('*')
          .order('provider')

        if (providerError) throw providerError
        setProviders(providerData)

      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
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
        brief: briefContent,
        notes: formData.get('notes'),
      }

      const { error } = await supabase
        .from('toll_free')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Changes saved successfully')
    } catch (error) {
      console.error('Error updating toll-free:', error)
      toast.error('Failed to save changes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !tollFree) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-red-600">{error || 'Toll-free number not found'}</div>
      </div>
    )
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

        <div className="grid gap-6 rounded-lg border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender</Label>
              <Input value={tollFree.sender.sender} disabled />
            </div>
            <div>
              <Label>DID</Label>
              <Input value={tollFree.did} disabled />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status_id">Status</Label>
                <Select name="status_id" defaultValue={tollFree.status_id.toString()}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
                <Select name="provider_id" defaultValue={tollFree.provider_id.toString()}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id.toString()}>
                        {provider.provider}
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
                defaultValue={tollFree.campaignid_tcr || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="use_case">Use Case</Label>
              <Input
                id="use_case"
                name="use_case"
                defaultValue={tollFree.use_case || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief">Brief</Label>
              <Input
                id="brief"
                name="brief"
                type="file"
                accept=".txt,.doc,.docx,.pdf"
                className="cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={tollFree.notes || ''}
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