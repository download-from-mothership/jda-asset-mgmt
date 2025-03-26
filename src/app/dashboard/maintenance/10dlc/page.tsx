"use client"

import * as React from "react"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../components/ui/alert-dialog"

type TenDLC = {
  id: number
  did: string
  sender_id: number
  sender: {
    id: number
    sender: string
    cta: string
    brand: string
    shorturl: string
  }
  status_id: number
  status: {
    id: number
    status: string
  }
  provider_id: number | null
  provider: {
    providerid: number
    provider_name: string
  } | null
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

interface TenDLCRecord {
  id: number
  did: string | null
  sender_id: number
  status_id: number
  provider_id: number | null
  campaignid_tcr: string | null
  use_case: string | null
  brief: string | null
  submitteddate: string | null
  notes: string | null
}

interface Status {
  id: number
  status: string
}

interface Provider {
  providerid: number
  provider_name: string
}

interface ProcessingStatus {
  isProcessing: boolean
  step: number
  message: string
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

export default function TenDLCPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = useSearchParams()[0]
  const isNew = id === 'new'
  const senderId = isNew ? searchParams.get('sender_id') : null
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tenDLC, setTenDLC] = React.useState<TenDLC | null>(null)
  const [senderData, setSenderData] = React.useState<{ sender: string } | null>(null)
  const [briefContent, setBriefContent] = React.useState<{ id: number, content: string } | null>(null)
  const [isEditingSamples, setIsEditingSamples] = React.useState(false)
  const [editedSamples, setEditedSamples] = React.useState<{
    sample_copy1: string | null,
    sample_copy2: string | null,
    sample_copy3: string | null
  } | null>(null)
  const [statuses, setStatuses] = React.useState<Status[]>([])
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGeneratingBrief, setIsGeneratingBrief] = React.useState(false)
  const [processingStatus, setProcessingStatus] = React.useState<ProcessingStatus>({
    isProcessing: false,
    step: 0,
    message: ''
  })
  const [generatedUseCase, setGeneratedUseCase] = React.useState<string>("")
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editedUseCase, setEditedUseCase] = React.useState("")
  const [spinSamples, setSpinSamples] = React.useState<{
    id: number,
    spin_sample1?: string,
    spin_sample2?: string,
    spin_sample3?: string,
    isEditing?: boolean,
    isGenerating?: boolean
  } | null>(null)

  const fetchStatuses = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sender_status')
        .select('id, status')
        .order('id')

      if (error) throw error
      setStatuses(data)
    } catch (error) {
      console.error('Error fetching statuses:', error)
      toast.error('Failed to load statuses')
    }
  }, [])

  const fetchProviders = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('provider')
        .select('providerid, provider_name')
        .order('provider_name')

      if (error) throw error
      setProviders(data)
    } catch (error) {
      console.error('Error fetching providers:', error)
      toast.error('Failed to load providers')
    }
  }, [])

  const fetchTenDLC = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!id) {
        throw new Error('Invalid 10DLC ID')
      }

      // Step 1: Fetch the 10DLC record first
      const { data: tenDLCData, error: tenDLCError } = await supabase
        .from('tendlc')
        .select('*')
        .eq('id', parseInt(id))
        .single()

      if (tenDLCError) {
        throw new Error(`Failed to fetch 10DLC record: ${tenDLCError.message}`)
      }

      if (!tenDLCData) {
        throw new Error('10DLC record not found')
      }

      const tenDLC = tenDLCData as unknown as TenDLCRecord
      console.log('Raw 10DLC data:', tenDLCData)

      // Step 2: Fetch related records based on 10DLC data
      const [
        { data: statusData },
        { data: providerData },
        { data: senderData }
      ] = await Promise.all([
        // Get status
        supabase
          .from('sender_status')
          .select('id, status')
          .eq('id', tenDLC.status_id)
          .single(),
        // Get provider if exists
        tenDLC.provider_id ? 
          supabase
            .from('provider')
            .select('providerid, provider_name')
            .eq('providerid', tenDLC.provider_id)
            .single() : 
          Promise.resolve({ data: null }),
        // Get sender
        supabase
          .from('sender')
          .select('id, sender, cta, brand, shorturl')
          .eq('id', tenDLC.sender_id)
          .single()
      ])

      const status = statusData as unknown as Status
      const provider = providerData as unknown as Provider | null
      const sender = senderData as unknown as { 
        id: number, 
        sender: string, 
        cta: string,
        brand: string | null,
        shorturl: string | null 
      }

      // Step 3: Fetch both initial and finalized samples
      const [{ data: initialSamplesData }, { data: finalizedSamplesData }] = await Promise.all([
        // Get initial samples from the view
        supabase
          .from('tendlc_sms_samples')
          .select('sample1, sample2, sample3')
          .eq('id', parseInt(id))
          .single(),
        // Get finalized samples from the table
        supabase
          .from('tendlc_samples')
          .select('sample_copy1, sample_copy2, sample_copy3')
          .eq('id', parseInt(id))
          .single()
      ])

      // Step 4: Transform and set the data
      const transformedData: TenDLC = {
        id: tenDLC.id,
        did: tenDLC.did || '',
        sender_id: tenDLC.sender_id,
        sender: {
          id: sender?.id || 0,
          sender: sender?.sender || '',
          cta: sender?.cta || '',
          brand: sender?.brand || '',
          shorturl: sender?.shorturl || ''
        },
        status_id: tenDLC.status_id,
        status: {
          id: status?.id || 0,
          status: status?.status || 'Unknown'
        },
        provider_id: tenDLC.provider_id,
        provider: provider ? {
          providerid: provider.providerid,
          provider_name: provider.provider_name
        } : null,
        campaignid_tcr: tenDLC.campaignid_tcr,
        use_case: tenDLC.use_case,
        brief: tenDLC.brief,
        submitteddate: tenDLC.submitteddate,
        notes: tenDLC.notes,
        initialSamples: initialSamplesData || null,
        finalizedSamples: finalizedSamplesData || null
      }

      setTenDLC(transformedData)
    } catch (error) {
      console.error('Error fetching 10DLC number:', error)
      setError(error instanceof Error ? error.message : 'Failed to load 10DLC number')
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      setIsSaving(true)

      if (isNew) {
        if (!senderId) {
          throw new Error('Sender ID is required')
        }

        const parsedSenderId = parseInt(senderId)
        if (isNaN(parsedSenderId)) {
          throw new Error(`Invalid sender ID format: ${senderId}`)
        }

        // Fetch sender information first
        const { data: senderData, error: senderError } = await supabase
          .from('sender')
          .select('sender')
          .eq('id', parsedSenderId)
          .single()

        if (senderError) {
          console.error('Error fetching sender:', senderError)
          throw new Error(`Failed to fetch sender: ${senderError.message}`)
        }

        if (!senderData?.sender) {
          throw new Error('Sender not found')
        }

        const didValue = formData.get('did') as string
        if (didValue && didValue.trim() !== '') {
          // Check if DID already exists
          const { data: existingDID, error: didCheckError } = await supabase
            .from('tendlc')
            .select('id')
            .eq('did', didValue)
            .single()

          if (didCheckError && !didCheckError.message.includes('No rows found')) {
            console.error('Error checking DID:', didCheckError)
            throw new Error(`Failed to check DID: ${didCheckError.message}`)
          }

          if (existingDID) {
            toast.error('This DID already exists in the system')
            return
          }
        }
        
        // Create basic 10DLC record with required fields
        const new10DLCData = {
          sender_id: parsedSenderId,
          sender: senderData.sender,
          status_id: 5, // Default status for new records
          did: didValue && didValue.trim() !== '' ? didValue : null,
          lastmodified: new Date().toISOString(),
          modified_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
          modified_by_name: (await supabase.auth.getSession()).data.session?.user?.email || null
        }

        console.log('Attempting to create new 10DLC record with data:', new10DLCData)

        const { data, error: createError } = await supabase
          .from('tendlc')
          .insert([new10DLCData])
          .select()
          .single()

        if (createError) {
          console.error('Database error creating 10DLC record:', {
            error: createError,
            data: new10DLCData,
            errorMessage: createError.message,
            details: createError.details,
            hint: createError.hint
          })
          throw new Error(`Failed to create 10DLC record: ${createError.message}`)
        }

        if (!data) {
          console.error('No data returned from insert')
          throw new Error('Failed to create 10DLC record: No data returned')
        }

        console.log('Successfully created 10DLC record:', data)
        toast.success('New 10DLC record created')
        navigate(`/dashboard/maintenance/10dlc/${data.id}`)
        return
      }

      // For existing records, update with all fields
      const updates = {
        status_id: parseInt(formData.get('status_id') as string),
        provider_id: parseInt(formData.get('provider_id') as string) || null,
        campaignid_tcr: formData.get('campaignid_tcr') as string || null,
        use_case: tenDLC?.use_case || null,
        notes: formData.get('notes') as string || null,
        did: formData.get('did') as string || null,  // Allow null DID instead of empty string
        // Set submitteddate when status changes to 7 (Submitted) and a date was not previously set
        ...(parseInt(formData.get('status_id') as string) === 7 && !tenDLC?.submitteddate && {
          submitteddate: formData.get('submitteddate') as string
        }),
        lastmodified: new Date().toISOString()
      }

      // Filter out any undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )

      console.log('Attempting to update 10DLC record with data:', {
        id,
        updates: cleanUpdates
      })

      const { error } = await supabase
        .from('tendlc')
        .update(cleanUpdates)
        .eq('id', parseInt(id || ''))

      if (error) {
        if (error.message.includes('value too long for type character varying(255)')) {
          toast.error('One of the text fields is too long. Please shorten it to less than 255 characters.');
          return;
        }
        console.error('Database error updating 10DLC record:', {
          error,
          updates: cleanUpdates,
          errorMessage: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      toast.success('Changes saved successfully')
      // Refresh the data
      fetchTenDLC()
    } catch (error) {
      console.error('Error updating 10DLC:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const generateUseCase = React.useCallback(async () => {
    try {
      if (!tenDLC) return;
      
      setProcessingStatus({
        isProcessing: true,
        step: 0,
        message: 'Initializing use case generation...'
      });

      // Get the current session for authentication
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error('No access token available');
      }

      // Call the Edge Function with the correct project URL
      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/generate-10dlc-use-case', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: tenDLC.id
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

      // Get the JSON response
      const useCaseData = await response.json();
      
      // Validate the response data
      if (!useCaseData || typeof useCaseData !== 'object') {
        console.error('Invalid response format:', useCaseData);
        throw new Error('Invalid response format from Edge Function');
      }

      if (!useCaseData.useCase || typeof useCaseData.useCase !== 'string') {
        console.error('Missing or invalid use case in response:', useCaseData);
        throw new Error('Missing use case data in response');
      }

      // Set the generated use case in state (don't save to database yet)
      setGeneratedUseCase(useCaseData.useCase);
      
      setProcessingStatus(prev => ({
        ...prev,
        step: 100,
        message: 'Use case generation completed'
      }));

      toast.success('Use case generated successfully');
    } catch (error: unknown) {
      console.error('Error generating use case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate use case: ${errorMessage}`);
      setProcessingStatus(prev => ({
        ...prev,
        step: 0,
        message: 'Use case generation failed'
      }));
    } finally {
      setProcessingStatus({
        isProcessing: false,
        step: 0,
        message: ''
      });
    }
  }, [tenDLC]);

  const generateSpinSamples = React.useCallback(async (tenDLCId: number) => {
    try {
      if (!tenDLC?.initialSamples) {
        toast.error('No samples found to generate from')
        return
      }

      setSpinSamples({
        id: tenDLCId,
        isGenerating: true,
        isEditing: false
      })

      // Replace placeholders in initial samples
      const sample1 = tenDLC.initialSamples.sample1?.replace('[brand]', tenDLC.sender.brand || '')
        .replace('[shorturl]', tenDLC.sender.shorturl || '') || ''
      const sample2 = tenDLC.initialSamples.sample2?.replace('[brand]', tenDLC.sender.brand || '')
        .replace('[shorturl]', tenDLC.sender.shorturl || '') || ''
      const sample3 = tenDLC.initialSamples.sample3?.replace('[brand]', tenDLC.sender.brand || '')
        .replace('[shorturl]', tenDLC.sender.shorturl || '') || ''

      const prompt = promptTemplate
        .replace('{sample1}', sample1)
        .replace('{sample2}', sample2)
        .replace('{sample3}', sample3)

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })

      const rewrittenText = response.choices[0]?.message?.content || ''
      const lines = rewrittenText.split('\n').filter(line => line.trim())
      
      // Set the edited samples and enter edit mode
      setEditedSamples({
        sample_copy1: lines[0]?.replace('Sample 1: ', '') || sample1,
        sample_copy2: lines[1]?.replace('Sample 2: ', '') || sample2,
        sample_copy3: lines[2]?.replace('Sample 3: ', '') || sample3
      })
      setIsEditingSamples(true)
      setSpinSamples(null)
    } catch (error) {
      console.error('Error generating spin samples:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate samples')
      setSpinSamples(null)
    }
  }, [tenDLC])

  React.useEffect(() => {
    fetchStatuses()
    fetchProviders()
    if (!isNew) {
      fetchTenDLC()
    } else if (senderId) {
      // Fetch sender data for new record
      const fetchSenderData = async () => {
        try {
          const { data: senderData, error: senderError } = await supabase
            .from('sender')
            .select('id, sender, cta, brand, shorturl')
            .eq('id', parseInt(senderId))
            .single()

          if (senderError) throw senderError
          if (!senderData) throw new Error('Sender not found')

          // Set initial 10DLC data with sender information
          setTenDLC({
            id: 0,
            did: '',
            sender_id: parseInt(senderId),
            sender: {
              id: senderData.id,
              sender: senderData.sender,
              cta: senderData.cta,
              brand: senderData.brand,
              shorturl: senderData.shorturl
            },
            status_id: 5, // Set to 5 for new records
            status: {
              id: 5,
              status: 'New'
            },
            provider_id: null,
            provider: null,
            campaignid_tcr: null,
            use_case: null,
            brief: null,
            submitteddate: null,
            notes: null,
            initialSamples: null,
            finalizedSamples: null
          })
        } catch (error) {
          console.error('Error fetching sender data:', error)
          toast.error('Failed to load sender data')
        }
      }

      fetchSenderData()
    }
  }, [fetchStatuses, fetchProviders, fetchTenDLC, isNew, senderId])

  if (loading && !isNew) {
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

  if (!isNew && !tenDLC) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-red-600">10DLC number not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Toaster />
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/maintenance/10dlc')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{isNew ? 'New' : 'Edit'} 10DLC Number</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 rounded-lg border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender</Label>
              <Input value={tenDLC?.sender?.sender || ''} disabled />
            </div>
            <div>
              <Label>DID</Label>
              <Input 
                name="did"
                defaultValue={tenDLC?.did || ''}
                disabled={tenDLC?.status_id !== 1 || !!tenDLC?.did} // Lock if status is not Approved OR if DID already exists
                placeholder="Enter DID when approved"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status_id" defaultValue={tenDLC?.status_id.toString()}>
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
            {(tenDLC?.submitteddate || tenDLC?.status_id === 7) && (
              <div className="space-y-2">
                <Label>Submitted Date</Label>
                {tenDLC?.submitteddate ? (
                  <Input 
                    value={new Date(tenDLC.submitteddate).toISOString().split('T')[0]} 
                    disabled 
                  />
                ) : (
                  <Input 
                    type="date"
                    name="submitteddate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select name="provider_id" defaultValue={tenDLC?.provider_id?.toString()}>
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
              <Input name="campaignid_tcr" defaultValue={tenDLC?.campaignid_tcr || ''} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Use Case</Label>
              {tenDLC && tenDLC.use_case && (
                <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Edit Use Case
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Edit Use Case</AlertDialogTitle>
                      <AlertDialogDescription>
                        Make changes to the use case below. Click save when you're done.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Textarea
                        value={editedUseCase || tenDLC.use_case || ""}
                        onChange={(e) => setEditedUseCase(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setEditedUseCase("")
                        setIsEditDialogOpen(false)
                      }}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('tendlc')
                            .update({ 
                              use_case: editedUseCase || tenDLC.use_case || "",
                              lastmodified: new Date().toISOString()
                            })
                            .eq('id', tenDLC.id)
                          
                          if (error) throw error
                          
                          toast.success("Use case updated successfully")
                          setIsEditDialogOpen(false)
                          setEditedUseCase("")
                          fetchTenDLC()
                        } catch (error) {
                          console.error('Error updating use case:', error)
                          toast.error("Failed to update use case")
                        }
                      }}>
                        Save Changes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {tenDLC?.use_case ? (
              <Textarea
                value={tenDLC.use_case}
                readOnly
                className="min-h-[100px]"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateUseCase}
                    disabled={processingStatus.isProcessing}
                  >
                    {processingStatus.isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Use Case"
                    )}
                  </Button>
                </div>
                {generatedUseCase && (
                  <div className="space-y-2">
                    <Textarea
                      value={generatedUseCase}
                      onChange={(e) => setGeneratedUseCase(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={generateUseCase}
                        disabled={processingStatus.isProcessing}
                      >
                        Generate New
                      </Button>
                      {tenDLC && (
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            try {
                              // Get the current session for authentication
                              const { data: { session } } = await supabase.auth.getSession()
                              if (!session?.access_token) {
                                throw new Error('No access token available')
                              }

                              // Update the use case in the database
                              const { error } = await supabase
                                .from('tendlc')
                                .update({ 
                                  use_case: generatedUseCase,
                                  lastmodified: new Date().toISOString()
                                })
                                .eq('id', tenDLC.id)
                              
                              if (error) throw error
                              
                              // Update the local state
                              setTenDLC(prev => prev ? {
                                ...prev,
                                use_case: generatedUseCase
                              } : null)
                              
                              // Update the form data
                              const form = document.querySelector('form')
                              if (form) {
                                const useCaseInput = form.querySelector('textarea[name="use_case"]')
                                if (useCaseInput) {
                                  useCaseInput.setAttribute('value', generatedUseCase)
                                }
                              }
                              
                              toast.success("Use case saved successfully")
                              setGeneratedUseCase("")
                            } catch (error) {
                              console.error('Error saving use case:', error)
                              toast.error(error instanceof Error ? error.message : "Failed to save use case")
                            }
                          }}
                        >
                          Save Use Case
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={tenDLC?.notes || ''} />
          </div>

          <div className="space-y-2">
            <Label>Message Copies</Label>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {tenDLC?.finalizedSamples ? "SMS Sample Copy" : "Generate SMS Copy"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-[600px]">
                  <div className="space-y-4">
                    {isEditingSamples ? (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-medium">Edit Message Copies</span>
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
                              onClick={async () => {
                                try {
                                  if (!editedSamples || !tenDLC) return

                                  // Get the current session for authentication
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (!session?.access_token) {
                                    throw new Error('No access token available')
                                  }

                                  // Call the Edge Function to handle sample updates
                                  const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/update-tendlc-samples', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${session.access_token}`,
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                      tenDLCId: tenDLC.id,
                                      samples: editedSamples
                                    })
                                  })

                                  if (!response.ok) {
                                    const errorText = await response.text()
                                    console.error('Edge Function error:', {
                                      status: response.status,
                                      statusText: response.statusText,
                                      error: errorText
                                    })
                                    throw new Error(`Failed to save samples: ${errorText}`)
                                  }

                                  const result = await response.json()
                                  console.log('Save result:', result)

                                  toast.success('SMS samples saved successfully')
                                  setEditedSamples(null)
                                  setIsEditingSamples(false)
                                  fetchTenDLC()
                                } catch (error) {
                                  console.error('Error saving SMS samples:', error)
                                  toast.error('Failed to save samples')
                                }
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Sample 1</Label>
                            <Textarea
                              value={editedSamples?.sample_copy1 || ''}
                              onChange={(e) => setEditedSamples(prev => ({
                                ...prev!,
                                sample_copy1: e.target.value
                              }))}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 2</Label>
                            <Textarea
                              value={editedSamples?.sample_copy2 || ''}
                              onChange={(e) => setEditedSamples(prev => ({
                                ...prev!,
                                sample_copy2: e.target.value
                              }))}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 3</Label>
                            <Textarea
                              value={editedSamples?.sample_copy3 || ''}
                              onChange={(e) => setEditedSamples(prev => ({
                                ...prev!,
                                sample_copy3: e.target.value
                              }))}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </>
                    ) : tenDLC?.initialSamples ? (
                      <>
                        <div className="flex flex-col gap-2 mb-4">
                          <span className="text-sm font-medium">Initial Samples (Read Only)</span>
                          <p className="text-sm text-muted-foreground">
                            These are the initial samples. Click "Generate New Samples" to create optimized message copies.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Initial Sample 1</Label>
                            <div className="rounded-md border p-2 bg-gray-50">
                              <p className="text-sm">
                                {tenDLC.initialSamples.sample1?.replace('[brand]', tenDLC.sender.brand || '')
                                  .replace('[shorturl]', tenDLC.sender.shorturl || '')}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Initial Sample 2</Label>
                            <div className="rounded-md border p-2 bg-gray-50">
                              <p className="text-sm">
                                {tenDLC.initialSamples.sample2?.replace('[brand]', tenDLC.sender.brand || '')
                                  .replace('[shorturl]', tenDLC.sender.shorturl || '')}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Initial Sample 3</Label>
                            <div className="rounded-md border p-2 bg-gray-50">
                              <p className="text-sm">
                                {tenDLC.initialSamples.sample3?.replace('[brand]', tenDLC.sender.brand || '')
                                  .replace('[shorturl]', tenDLC.sender.shorturl || '')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button
                            type="button"
                            className="w-full"
                            disabled={processingStatus.isProcessing}
                            onClick={() => generateSpinSamples(tenDLC.id)}
                          >
                            {processingStatus.isProcessing ? "Generating..." : "Generate New Samples"}
                          </Button>
                        </div>
                      </>
                    ) : tenDLC?.finalizedSamples ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Current Message Copies</span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditedSamples({
                                sample_copy1: tenDLC.finalizedSamples?.sample_copy1 || null,
                                sample_copy2: tenDLC.finalizedSamples?.sample_copy2 || null,
                                sample_copy3: tenDLC.finalizedSamples?.sample_copy3 || null,
                              })
                              setIsEditingSamples(true)
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Sample 1</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tenDLC.finalizedSamples.sample_copy1}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 2</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tenDLC.finalizedSamples.sample_copy2}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 3</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tenDLC.finalizedSamples.sample_copy3}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No message samples available.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  )
} 