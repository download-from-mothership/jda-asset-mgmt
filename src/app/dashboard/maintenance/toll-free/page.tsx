"use client"

import * as React from "react"
import { ArrowLeft, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate, useParams } from "react-router-dom"
import { Toaster, toast } from "sonner"
import { OpenAI } from 'openai'

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type TollFree = {
  id: number
  did: string
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
    providerid: number
    provider_name: string
  }
  campaignid_tcr: string | null
  use_case: string | null
  brief: string | null
  submitteddate: string | null
  notes: string | null
  samples?: {
    sample_copy1?: string | null
    sample_copy2?: string | null
    sample_copy3?: string | null
  } | null
}

type Status = {
  id: number
  status: string
}

type Provider = {
  providerid: number
  provider_name: string
}

interface DatabaseTollFree {
  id: number
  did: string
  sender: {
    sender: string
  }
  status: {
    id: number
    status: string
  }
  provider_id: number
  provider: {
    providerid: number
    provider_name: string
  }
  campaignid_tcr: string | null
  use_case: string | null
  brief: string | null
  submitteddate: string | null
  notes: string | null
}

type DatabaseSMSSamples = {
  id: number
  sample1: string | null
  sample2: string | null
  sample3: string | null
}

const openai = new OpenAI({ 
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
})

const promptTemplate = `
Rewrite the following SMS marketing copies while following these requirements:
1. Keep the original leading text prefix in place exactly as it appears in the sample (do not alter, remove, or change any characters in that prefix).
2. Keep the general tone and structure of the original.
3. Stay at or under 160 characters total (including spaces).
4. Optimize the language for a sub-prime audience.
5. Encourage click-through, (i.e., make it compelling to visit the link).
6. Avoid being overly aggressive.
7. Avoid common "trigger" words that can flag SMS campaigns.

SMS Copy:
Sample 1: {sample1}
Sample 2: {sample2}
Sample 3: {sample3}
`

export default function TollFreePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tollFree, setTollFree] = React.useState<TollFree | null>(null)
  const [briefContent, setBriefContent] = React.useState<{ id: number, content: string } | null>(null)
  const [spinSamples, setSpinSamples] = React.useState<{
    id: number,
    spin_sample1?: string,
    spin_sample2?: string,
    spin_sample3?: string,
    isEditing?: boolean,
    isGenerating?: boolean
  } | null>(null)
  const [statuses, setStatuses] = React.useState<Status[]>([])
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [isSaving, setIsSaving] = React.useState(false)

  const fetchTollFree = React.useCallback(async () => {
    try {
      if (!id) {
        throw new Error('Invalid toll-free ID')
      }

      setLoading(true)
      setError(null)
      
      // First fetch the toll-free record
      const { data: tollFreeData, error: tollFreeError } = await supabase
        .from('toll_free')
        .select(`
          id,
          did,
          sender,
          status:sender_status!status_id(
            id,
            status
          ),
          provider_id,
          provider!provider_id(
            providerid,
            provider_name
          ),
          campaignid_tcr,
          use_case,
          brief,
          submitteddate,
          notes
        `)
        .eq('id', parseInt(id))
        .single()

      console.log('Toll Free Data:', { data: tollFreeData, error: tollFreeError })

      if (tollFreeError) {
        console.error('Toll Free Error Details:', {
          message: tollFreeError.message,
          details: tollFreeError.details,
          hint: tollFreeError.hint
        })
        throw new Error(tollFreeError.message)
      }

      if (!tollFreeData) {
        throw new Error('Toll-free record not found')
      }

      // Fetch brief content if it exists
      if (tollFreeData.brief) {
        const { data: briefData, error: briefError } = await supabase
          .from('brief')
          .select('id, content')
          .eq('id', parseInt(id))
          .single()

        if (briefError && briefError.code !== 'PGRST116') { // Ignore not found error
          console.error('Error fetching brief:', briefError)
        } else if (briefData) {
          setBriefContent({
            id: briefData.id as number,
            content: briefData.content as string
          })
        }
      }

      const typedTollFreeData = {
        id: tollFreeData.id as number,
        did: tollFreeData.did as string,
        sender: {
          sender: tollFreeData.sender as string
        },
        status: {
          id: (tollFreeData.status as any).id as number,
          status: (tollFreeData.status as any).status as string
        },
        provider_id: tollFreeData.provider_id as number,
        provider: {
          providerid: (tollFreeData.provider as any).providerid as number,
          provider_name: (tollFreeData.provider as any).provider_name as string
        },
        campaignid_tcr: tollFreeData.campaignid_tcr as string | null,
        use_case: tollFreeData.use_case as string | null,
        brief: tollFreeData.brief as string | null,
        submitteddate: tollFreeData.submitteddate as string | null,
        notes: tollFreeData.notes as string | null
      } as DatabaseTollFree

      // Fetch samples
      const { data: samplesData, error: samplesError } = await supabase
        .from('toll_free_sms_samples')
        .select('sample1, sample2, sample3')
        .eq('id', parseInt(id))
        .single()

      if (samplesError && samplesError.code !== 'PGRST116') { // Ignore not found error
        console.error('Error fetching samples:', samplesError)
        throw samplesError
      }

      // Transform the data
      const transformedData: TollFree = {
        id: typedTollFreeData.id,
        did: typedTollFreeData.did,
        sender: typedTollFreeData.sender,
        status_id: typedTollFreeData.status.id,
        status: typedTollFreeData.status,
        provider_id: typedTollFreeData.provider_id,
        provider: typedTollFreeData.provider,
        campaignid_tcr: typedTollFreeData.campaignid_tcr,
        use_case: typedTollFreeData.use_case,
        brief: typedTollFreeData.brief,
        submitteddate: typedTollFreeData.submitteddate,
        notes: typedTollFreeData.notes,
        samples: samplesData ? {
          sample_copy1: samplesData.sample1 as string | null,
          sample_copy2: samplesData.sample2 as string | null,
          sample_copy3: samplesData.sample3 as string | null
        } : null
      }

      setTollFree(transformedData)

      // Fetch statuses
      const { data: statusData, error: statusError } = await supabase
        .from('sender_status')
        .select('id, status')
        .order('status')

      if (statusError) throw statusError
      setStatuses((statusData || []).map(row => ({
        id: row.id as number,
        status: row.status as string
      })))

      // Fetch providers
      const { data: providerData, error: providerError } = await supabase
        .from('provider')
        .select('providerid, provider_name')
        .order('provider_name')

      if (providerError) throw providerError
      setProviders((providerData || []).map(row => ({
        providerid: row.providerid as number,
        provider_name: row.provider_name as string
      })))
    } catch (error) {
      console.error('Error fetching toll-free number:', error)
      setError(error instanceof Error ? error.message : 'Failed to load toll-free number')
    } finally {
      setLoading(false)
    }
  }, [id])

  const generateSpinSamples = React.useCallback(async (tollFreeId: number) => {
    try {
      setSpinSamples({
        id: tollFreeId,
        isGenerating: true,
        isEditing: false
      })

      // Fetch from the view
      const { data, error } = await supabase
        .from('toll_free_sms_samples')
        .select('id, sample1, sample2, sample3')
        .eq('id', tollFreeId)
        .single()
      
      if (error) {
        toast.error('Failed to fetch original samples')
        throw error
      }

      const typedData = data as DatabaseSMSSamples

      if (!typedData.sample1 && !typedData.sample2 && !typedData.sample3) {
        toast.error('No original samples found to generate from')
        setSpinSamples(null)
        return
      }

      const prompt = promptTemplate
        .replace('{sample1}', typedData.sample1 || '')
        .replace('{sample2}', typedData.sample2 || '')
        .replace('{sample3}', typedData.sample3 || '')

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })

      const rewrittenText = response.choices[0]?.message?.content || ''
      const lines = rewrittenText.split('\n').filter(line => line.trim())
      
      setSpinSamples({
        id: tollFreeId,
        spin_sample1: lines[0]?.replace('Sample 1: ', '') || typedData.sample1 || '',
        spin_sample2: lines[1]?.replace('Sample 2: ', '') || typedData.sample2 || '',
        spin_sample3: lines[2]?.replace('Sample 3: ', '') || typedData.sample3 || '',
        isEditing: true,
        isGenerating: false
      })
    } catch (error) {
      console.error('Error generating spin samples:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate samples')
      setSpinSamples(null)
    }
  }, [])

  const saveSampleCopies = React.useCallback(async (tollFreeId: number, samples: {
    sample_copy1: string,
    sample_copy2: string,
    sample_copy3: string
  }) => {
    try {
      const { error } = await supabase
        .from('toll_free_samples')
        .upsert({
          id: tollFreeId,
          ...samples
        }, { onConflict: 'id' })

      if (error) throw error

      toast.success('Samples saved successfully')
      setSpinSamples(null)
      fetchTollFree()
    } catch (error) {
      console.error('Error saving samples:', error)
      toast.error('Failed to save samples')
    }
  }, [fetchTollFree])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const formData = new FormData(e.currentTarget)
      const briefFile = (document.getElementById('brief') as HTMLInputElement)?.files?.[0]
      
      let briefContent = null
      if (briefFile) {
        briefContent = await briefFile.text()
        // Save brief content to brief table
        const { error: briefError } = await supabase
          .from('brief')
          .upsert({
            id: parseInt(id!),
            content: briefContent
          }, { onConflict: 'id' })

        if (briefError) throw briefError
      }

      const updates = {
        status_id: parseInt(formData.get('status_id') as string),
        provider_id: parseInt(formData.get('provider_id') as string),
        campaignid_tcr: formData.get('campaignid_tcr') as string | null,
        use_case: formData.get('use_case') as string | null,
        brief: briefFile ? 'Y' : briefContent ? 'Y' : null,
        notes: formData.get('notes') as string | null,
      }

      const { error } = await supabase
        .from('toll_free')
        .update(updates)
        .eq('id', parseInt(id || ''))

      if (error) throw error

      toast.success('Changes saved successfully')
      // Refresh the data
      fetchTollFree()
    } catch (error) {
      console.error('Error updating toll-free:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    try {
      setIsSaving(true)
      
      // Here you would typically update your data
      // For demonstration, we'll just show a success toast after a brief delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success("Changes have been saved successfully")
    } catch (error) {
      toast.error("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  React.useEffect(() => {
    fetchTollFree()
  }, [fetchTollFree])

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
      <Toaster />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
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
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 rounded-lg border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender</Label>
              <Input value={tollFree?.sender.sender} disabled />
            </div>
            <div>
              <Label>DID</Label>
              <Input value={tollFree?.did} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select name="status_id" defaultValue={tollFree?.status_id.toString()}>
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
            <Label>Provider</Label>
            <Select name="provider_id" defaultValue={tollFree?.provider_id.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
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

          <div className="space-y-2">
            <Label>Campaign ID TCR</Label>
            <Input name="campaignid_tcr" defaultValue={tollFree?.campaignid_tcr || ''} />
          </div>

          <div className="space-y-2">
            <Label>Use Case</Label>
            <Input name="use_case" defaultValue={tollFree?.use_case || ''} />
          </div>

          <div className="space-y-2">
            <Label>Brief</Label>
            {briefContent ? (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap">{briefContent.content}</pre>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setBriefContent(null)}
                  >
                    Replace Brief
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      const blob = new Blob([briefContent.content], { type: 'text/plain' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `brief_${id}.txt`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      window.URL.revokeObjectURL(url)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download Brief
                  </Button>
                </div>
              </div>
            ) : (
              <Input type="file" id="brief" name="brief" accept=".txt" />
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={tollFree?.notes || ''} />
          </div>

          <div className="space-y-2">
            <Label>Message Copies</Label>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    SMS Message Copy
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    {tollFree?.samples ? (
                      <>
                        {tollFree.samples.sample_copy1 && (
                          <div className="space-y-2">
                            <Label>Copy 1</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tollFree.samples.sample_copy1}</p>
                            </div>
                          </div>
                        )}
                        {tollFree.samples.sample_copy2 && (
                          <div className="space-y-2">
                            <Label>Copy 2</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tollFree.samples.sample_copy2}</p>
                            </div>
                          </div>
                        )}
                        {tollFree.samples.sample_copy3 && (
                          <div className="space-y-2">
                            <Label>Copy 3</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tollFree.samples.sample_copy3}</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : spinSamples?.isEditing ? (
                      <>
                        <h3 className="font-medium">Alternative Copies</h3>
                        {spinSamples.spin_sample1 && (
                          <div className="space-y-2">
                            <Label>Alternative 1</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{spinSamples.spin_sample1}</p>
                            </div>
                          </div>
                        )}
                        {spinSamples.spin_sample2 && (
                          <div className="space-y-2">
                            <Label>Alternative 2</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{spinSamples.spin_sample2}</p>
                            </div>
                          </div>
                        )}
                        {spinSamples.spin_sample3 && (
                          <div className="space-y-2">
                            <Label>Alternative 3</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{spinSamples.spin_sample3}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSpinSamples(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="flex-1"
                            onClick={() => {
                              if (spinSamples.spin_sample1 && spinSamples.spin_sample2 && spinSamples.spin_sample3) {
                                saveSampleCopies(tollFree.id, {
                                  sample_copy1: spinSamples.spin_sample1,
                                  sample_copy2: spinSamples.spin_sample2,
                                  sample_copy3: spinSamples.spin_sample3
                                })
                              }
                            }}
                          >
                            Use These
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">No message copies available.</p>
                    )}
                    
                    {!tollFree?.samples && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={spinSamples?.isGenerating}
                        onClick={() => generateSpinSamples(tollFree.id)}
                      >
                        {spinSamples?.isGenerating ? "Generating..." : "Generate Alternatives"}
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={handleUpdate}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving..." : "Update Record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 