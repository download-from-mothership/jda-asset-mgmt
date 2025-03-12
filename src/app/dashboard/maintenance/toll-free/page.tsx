"use client"

import * as React from "react"
import { ArrowLeft, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
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
  sender_id: number
  sender: {
    id: number
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
  initialSamples?: {
    sample1?: string | null
    sample2?: string | null
    sample3?: string | null
  } | null
  finalizedSamples?: {
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

type BriefResponse = {
  briefid: number;
  brief?: string;
}

interface DatabaseTollFree {
  id: number
  did: string
  sender_id: number
  sender: {
    id: number
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
  const searchParams = useSearchParams()[0]
  const isNew = id === 'new'
  const senderId = isNew ? searchParams.get('sender_id') : null
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tollFree, setTollFree] = React.useState<TollFree | null>(null)
  const [briefContent, setBriefContent] = React.useState<{ id: number, content: string } | null>(null)
  const [isEditingSamples, setIsEditingSamples] = React.useState(false)
  const [editedSamples, setEditedSamples] = React.useState<{
    sample_copy1: string | null,
    sample_copy2: string | null,
    sample_copy3: string | null
  } | null>(null)
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
  const [isGeneratingBrief, setIsGeneratingBrief] = React.useState(false)

  const fetchTollFree = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch statuses and providers regardless of new/existing
      const { data: statusData, error: statusError } = await supabase
        .from('sender_status')
        .select('id, status')
        .order('status')

      if (statusError) throw statusError
      setStatuses((statusData || []).map(row => ({
        id: row.id as number,
        status: row.status as string
      })))

      const { data: providerData, error: providerError } = await supabase
        .from('provider')
        .select('providerid, provider_name')
        .order('provider_name')

      if (providerError) throw providerError
      setProviders((providerData || []).map(row => ({
        providerid: row.providerid as number,
        provider_name: row.provider_name as string
      })))

      if (isNew) {
        if (!senderId) {
          throw new Error('Sender ID is required for new toll-free records')
        }

        // First check if a toll-free record already exists for this sender
        const { data: existingTollFree, error: existingError } = await supabase
          .from('toll_free')
          .select(`
            id,
            did,
            sender_id,
            sender:sender_id(
              id,
              sender
            ),
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
          .eq('sender_id', parseInt(senderId))
          .single()

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Error checking existing toll-free:', existingError)
          throw new Error(`Failed to check existing toll-free: ${existingError.message}`)
        }

        if (existingTollFree) {
          // If record exists, redirect to the existing record
          navigate(`/dashboard/maintenance/toll-free/${existingTollFree.id}`)
          return
        }

        // If no existing record, fetch sender information for new record
        const { data: senderData, error: senderError } = await supabase
          .from('sender')
          .select('id, sender')
          .eq('id', parseInt(senderId))
          .single()

        if (senderError) {
          console.error('Error fetching sender:', senderError)
          throw new Error(`Failed to fetch sender: ${senderError.message}`)
        }

        if (!senderData) {
          throw new Error('Sender not found')
        }

        // Initialize empty toll-free record with sender info
        setTollFree({
          id: 0, // Will be assigned by database
          did: '',
          sender_id: senderData.id as number,
          sender: {
            id: senderData.id as number,
            sender: senderData.sender as string
          },
          status_id: 1, // Default status
          status: {
            id: 1,
            status: 'Need to Apply'
          },
          provider_id: 0,
          provider: {
            providerid: 0,
            provider_name: ''
          },
          campaignid_tcr: null,
          use_case: null,
          brief: null,
          submitteddate: null,
          notes: null,
          initialSamples: null,
          finalizedSamples: null
        })
        return
      }

      if (!id) {
        throw new Error('Invalid toll-free ID')
      }
      
      // First fetch the toll-free record
      const { data: tollFreeData, error: tollFreeError } = await supabase
        .from('toll_free')
        .select(`
          id,
          did,
          sender_id,
          sender:sender_id(
            id,
            sender
          ),
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
        const briefId = typeof tollFreeData.brief === 'string' ? tollFreeData.brief : tollFreeData.brief.toString();
        const { data: briefData, error: briefError } = await supabase
          .from('brief')
          .select<string, BriefResponse>('briefid, brief')
          .eq('briefid', parseInt(briefId))
          .maybeSingle();

        if (briefError && briefError.code !== 'PGRST116') { // Ignore not found error
          console.error('Error fetching brief:', briefError)
        } else if (briefData) {
          setBriefContent({
            id: briefData.briefid,
            content: briefData.brief || ''
          })
        }
      }

      const typedTollFreeData = {
        id: tollFreeData.id as number,
        did: tollFreeData.did as string,
        sender_id: tollFreeData.sender_id as number,
        sender: {
          id: (tollFreeData.sender as any).id as number,
          sender: (tollFreeData.sender as any).sender as string
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

      // Fetch initial samples from view
      const { data: initialSamplesData, error: initialSamplesError } = await supabase
        .from('toll_free_sms_samples')
        .select('sample1, sample2, sample3')
        .eq('id', parseInt(id))
        .single()

      if (initialSamplesError && initialSamplesError.code !== 'PGRST116') {
        console.error('Error fetching initial samples:', initialSamplesError)
        throw initialSamplesError
      }

      // Fetch finalized samples from table
      const { data: finalizedSamplesData, error: finalizedSamplesError } = await supabase
        .from('toll_free_samples')
        .select('sample_copy1, sample_copy2, sample_copy3')
        .eq('id', parseInt(id))
        .single()

      if (finalizedSamplesError && finalizedSamplesError.code !== 'PGRST116') {
        console.error('Error fetching finalized samples:', finalizedSamplesError)
        throw finalizedSamplesError
      }

      // Transform the data
      const transformedData: TollFree = {
        id: typedTollFreeData.id,
        did: typedTollFreeData.did,
        sender_id: typedTollFreeData.sender_id,
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
        initialSamples: initialSamplesData ? {
          sample1: initialSamplesData.sample1 as string | null,
          sample2: initialSamplesData.sample2 as string | null,
          sample3: initialSamplesData.sample3 as string | null
        } : null,
        finalizedSamples: finalizedSamplesData ? {
          sample_copy1: finalizedSamplesData.sample_copy1 as string | null,
          sample_copy2: finalizedSamplesData.sample_copy2 as string | null,
          sample_copy3: finalizedSamplesData.sample_copy3 as string | null
        } : null
      }

      setTollFree(transformedData)
    } catch (error) {
      console.error('Error fetching toll-free number:', error)
      setError(error instanceof Error ? error.message : 'Failed to load toll-free number')
    } finally {
      setLoading(false)
    }
  }, [id, senderId])

  const generateSpinSamples = React.useCallback(async (tollFreeId: number) => {
    try {
      if (!tollFree?.initialSamples) {
        toast.error('No samples found to generate from')
        return
      }

      setSpinSamples({
        id: tollFreeId,
        isGenerating: true,
        isEditing: false
      })

      const prompt = promptTemplate
        .replace('{sample1}', tollFree.initialSamples.sample1 || '')
        .replace('{sample2}', tollFree.initialSamples.sample2 || '')
        .replace('{sample3}', tollFree.initialSamples.sample3 || '')

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })

      const rewrittenText = response.choices[0]?.message?.content || ''
      const lines = rewrittenText.split('\n').filter(line => line.trim())
      
      // Set the edited samples and enter edit mode
      setEditedSamples({
        sample_copy1: lines[0]?.replace('Sample 1: ', '') || tollFree.initialSamples.sample1 || '',
        sample_copy2: lines[1]?.replace('Sample 2: ', '') || tollFree.initialSamples.sample2 || '',
        sample_copy3: lines[2]?.replace('Sample 3: ', '') || tollFree.initialSamples.sample3 || ''
      })
      setIsEditingSamples(true)
      setSpinSamples(null)
    } catch (error) {
      console.error('Error generating spin samples:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate samples')
      setSpinSamples(null)
    }
  }, [tollFree])

  const saveSampleEdits = React.useCallback(async () => {
    if (!tollFree || !editedSamples) return

    try {
      console.log('Attempting to save samples:', {
        id: tollFree.id,
        samples: editedSamples
      })

      const { data, error } = await supabase
        .from('toll_free_samples')
        .upsert({
          id: tollFree.id,
          sample_copy1: editedSamples.sample_copy1,
          sample_copy2: editedSamples.sample_copy2,
          sample_copy3: editedSamples.sample_copy3
        }, { onConflict: 'id' })

      if (error) {
        console.error('Error saving samples:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('Samples saved successfully:', data)
      toast.success('SMS Message Copy Saved!')
      setIsEditingSamples(false)
      fetchTollFree()
    } catch (error) {
      console.error('Error in saveSampleEdits:', error)
      toast.error('Failed to save samples')
    }
  }, [tollFree, editedSamples, fetchTollFree])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      const formData = new FormData(e.currentTarget)
      const briefFile = (document.getElementById('brief') as HTMLInputElement)?.files?.[0]
      
      let briefId = null
      if (briefFile) {
        const fileBuffer = await briefFile.arrayBuffer();
        const base64Content = Buffer.from(fileBuffer).toString('base64');
        
        // Save brief content to brief table
        const { data: briefData, error: briefError } = await supabase
          .from('brief')
          .insert({
            brief: base64Content
          })
          .select<string, BriefResponse>('briefid')
          .maybeSingle();

        if (briefError) throw briefError
        briefId = briefData?.briefid
      }

      const updates = {
        status_id: parseInt(formData.get('status_id') as string),
        provider_id: parseInt(formData.get('provider_id') as string),
        campaignid_tcr: formData.get('campaignid_tcr') as string | null,
        use_case: formData.get('use_case') as string | null,
        brief: briefId ? briefId.toString() : tollFree?.brief,
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

  const generateBrief = React.useCallback(async () => {
    try {
      if (!tollFree) return;
      
      setIsGeneratingBrief(true);
      console.log('Starting brief generation for toll-free ID:', tollFree.id);

      // Get the current session to check authentication
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', {
        hasSession: !!session,
        user: session?.user?.email,
        accessToken: !!session?.access_token
      });

      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      // Call the Edge Function with the correct project URL
      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/generate-brief', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tollFreeId: tollFree.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition ? 
        contentDisposition.split('filename=')[1].replace(/"/g, '') :
        `brief-${tollFree.id}-${Date.now()}.docx`;

      // Get the binary data
      const blob = await response.blob();

      // Create download URL and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Brief generated successfully');
    } catch (error: unknown) {
      console.error('Error generating brief:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate brief: ${errorMessage}`);
    } finally {
      setIsGeneratingBrief(false);
    }
  }, [tollFree]);

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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label>Use Case</Label>
            <Input name="use_case" defaultValue={tollFree?.use_case || ''} />
          </div>

          <div className="space-y-2">
            <Label>Brief</Label>
            {tollFree?.status.status === "Need to Apply" && !briefContent && (
              <div className="mb-4">
                <Button
                  type="button"
                  onClick={generateBrief}
                  disabled={isGeneratingBrief}
                >
                  {isGeneratingBrief ? "Generating Brief..." : "Generate Brief"}
                </Button>
              </div>
            )}
            {briefContent ? (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap">
                    {(() => {
                      try {
                        // Make sure we have a valid base64 string by removing any whitespace
                        const cleanBase64 = (briefContent.content as string).replace(/\s/g, '');
                        return atob(cleanBase64);
                      } catch (error) {
                        console.error('Error decoding brief content:', error);
                        return 'Error: Unable to decode brief content';
                      }
                    })()}
                  </pre>
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
                <PopoverContent side="top" align="start" className="w-[600px]">
                  <div className="space-y-4">
                    {(tollFree?.finalizedSamples || tollFree?.initialSamples) ? (
                      <>
                        <div className="flex justify-end mb-4">
                          {!isEditingSamples && tollFree.status.status !== "Submitted" ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditedSamples({
                                    sample_copy1: tollFree.finalizedSamples?.sample_copy1 || tollFree.initialSamples?.sample1 || null,
                                    sample_copy2: tollFree.finalizedSamples?.sample_copy2 || tollFree.initialSamples?.sample2 || null,
                                    sample_copy3: tollFree.finalizedSamples?.sample_copy3 || tollFree.initialSamples?.sample3 || null
                                  })
                                  setIsEditingSamples(true)
                                }}
                              >
                                Edit Samples
                              </Button>
                            </div>
                          ) : isEditingSamples ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingSamples(false)
                                  setEditedSamples(null)
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={saveSampleEdits}
                              >
                                Save Changes
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        {(tollFree.finalizedSamples?.sample_copy1 || tollFree.initialSamples?.sample1) && (
                          <div className="space-y-2">
                            <Label><span className="font-semibold">Sample</span> Copy 1</Label>
                            {isEditingSamples && tollFree.status.status !== "Submitted" ? (
                              <Textarea
                                value={editedSamples?.sample_copy1 || ''}
                                onChange={(e) => setEditedSamples(prev => ({
                                  ...prev!,
                                  sample_copy1: e.target.value
                                }))}
                                className="text-sm"
                              />
                            ) : (
                              <div className="rounded-md border p-2">
                                <p className="text-sm">{tollFree.finalizedSamples?.sample_copy1 || tollFree.initialSamples?.sample1}</p>
                                {tollFree.status.status === "Submitted" && (
                                  <p className="text-xs text-muted-foreground mt-1">Locked - Status is Submitted</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {(tollFree.finalizedSamples?.sample_copy2 || tollFree.initialSamples?.sample2) && (
                          <div className="space-y-2">
                            <Label><span className="font-semibold">Sample</span> Copy 2</Label>
                            {isEditingSamples && tollFree.status.status !== "Submitted" ? (
                              <Textarea
                                value={editedSamples?.sample_copy2 || ''}
                                onChange={(e) => setEditedSamples(prev => ({
                                  ...prev!,
                                  sample_copy2: e.target.value
                                }))}
                                className="text-sm"
                              />
                            ) : (
                              <div className="rounded-md border p-2">
                                <p className="text-sm">{tollFree.finalizedSamples?.sample_copy2 || tollFree.initialSamples?.sample2}</p>
                                {tollFree.status.status === "Submitted" && (
                                  <p className="text-xs text-muted-foreground mt-1">Locked - Status is Submitted</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {(tollFree.finalizedSamples?.sample_copy3 || tollFree.initialSamples?.sample3) && (
                          <div className="space-y-2">
                            <Label><span className="font-semibold">Sample</span> Copy 3</Label>
                            {isEditingSamples && tollFree.status.status !== "Submitted" ? (
                              <Textarea
                                value={editedSamples?.sample_copy3 || ''}
                                onChange={(e) => setEditedSamples(prev => ({
                                  ...prev!,
                                  sample_copy3: e.target.value
                                }))}
                                className="text-sm"
                              />
                            ) : (
                              <div className="rounded-md border p-2">
                                <p className="text-sm">{tollFree.finalizedSamples?.sample_copy3 || tollFree.initialSamples?.sample3}</p>
                                {tollFree.status.status === "Submitted" && (
                                  <p className="text-xs text-muted-foreground mt-1">Locked - Status is Submitted</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {tollFree.status.status !== "Submitted" && (
                          <div className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              disabled={spinSamples?.isGenerating}
                              onClick={() => generateSpinSamples(tollFree.id)}
                            >
                              {spinSamples?.isGenerating ? "Generating..." : "Generate New Alternatives"}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">No message copies available.</p>
                        {tollFree.status.status !== "Submitted" && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={spinSamples?.isGenerating}
                            onClick={() => generateSpinSamples(tollFree.id)}
                          >
                            {spinSamples?.isGenerating ? "Generating..." : "Generate Samples"}
                          </Button>
                        )}
                        {tollFree.status.status === "Submitted" && (
                          <p className="text-sm text-muted-foreground">Cannot generate samples - Status is Submitted</p>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <Button
              type="submit"
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