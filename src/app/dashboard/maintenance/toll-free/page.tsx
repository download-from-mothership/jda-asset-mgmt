"use client"

import * as React from "react"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Toaster, toast } from "sonner"
import { OpenAI } from 'openai'
import { useQuery } from "@tanstack/react-query"

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
import { DataTable } from "@/components/ui/data-table"

interface Status {
  id: number
  status: string
}

interface Provider {
  providerid: number
  provider_name: string
}

interface TollFree {
  id: number
  did: string | null
  business_name: string | null
  status_id: number
  provider_id: number | null
  campaignid_tcr: string | null
  use_case: string | null
  use_case_helper: string | null
  brief: number | null
  submitteddate: string | null
  notes: string | null
  lastmodified: string
  modified_by: string | null
  modified_by_name: string | null
  sender_id: number | null
  sender?: {
    id: number
    sender: string
    cta: string
  }
  initialSamples?: {
    sample1: string | null
    sample2: string | null
    sample3: string | null
  }
  finalizedSamples?: {
    sample_copy1: string | null
    sample_copy2: string | null
    sample_copy3: string | null
  }
}

interface ProcessingStatus {
  isProcessing: boolean
  step: number
  message: string
}

interface BriefResponse {
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
    cta: string
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

interface TollFreeRecord {
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

interface StatusRecord {
  id: number
  status: string
}

interface ProviderRecord {
  providerid: number
  provider_name: string
}

interface SenderRecord {
  id: number
  sender: string
  cta: string
}

interface InitialSamples {
  sample1: string | null
  sample2: string | null
  sample3: string | null
}

interface FinalizedSamples {
  sample_copy1: string | null
  sample_copy2: string | null
  sample_copy3: string | null
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
  const [senderInfo, setSenderInfo] = React.useState<SenderRecord | null>(null)
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
  const [processingStatus, setProcessingStatus] = React.useState<ProcessingStatus>({
    isProcessing: false,
    step: 0,
    message: ''
  })
  const [generatedUseCase, setGeneratedUseCase] = React.useState<string>("")
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editedUseCase, setEditedUseCase] = React.useState("")

  // Fetch toll-free data
  const { data: tollFreeData, isLoading } = useQuery({
    queryKey: ['tollfree', id],
    queryFn: async () => {
      if (isNew) {
        return null;
      }

      const { data, error: tollFreeError } = await supabase
        .from('tollfree')
        .select(`
          *,
          sender:sender_id (
            id,
            sender,
            cta
          ),
          toll_free_samples (
            sample1,
            sample2,
            sample3
          ),
          toll_free_finalized_samples (
            sample_copy1,
            sample_copy2,
            sample_copy3
          )
        `)
        .eq('id', id)
        .single()

      if (tollFreeError) {
        throw new Error(tollFreeError.message)
      }

      if (!data) {
        throw new Error('No data found')
      }

      const initialSamplesData = data.toll_free_samples?.[0] || null
      const finalizedSamplesData = data.toll_free_finalized_samples?.[0] || null

      return {
        ...data,
        initialSamples: initialSamplesData ? {
          sample1: initialSamplesData.sample1,
          sample2: initialSamplesData.sample2,
          sample3: initialSamplesData.sample3
        } : undefined,
        finalizedSamples: finalizedSamplesData ? {
          sample_copy1: finalizedSamplesData.sample_copy1,
          sample_copy2: finalizedSamplesData.sample_copy2,
          sample_copy3: finalizedSamplesData.sample_copy3
        } : undefined
      } as TollFree
    },
    enabled: !isNew && !!id
  })

  React.useEffect(() => {
    if (tollFreeData) {
      setTollFree(tollFreeData)
      setLoading(false)
    }
  }, [tollFreeData])

  // Add validation for sender_id
  React.useEffect(() => {
    if (isNew && senderId) {
      const parsedSenderId = parseInt(senderId)
      if (isNaN(parsedSenderId)) {
        setError(`Invalid sender ID format: ${senderId}`)
        return
      }
    }
  }, [isNew, senderId])

  // Add effect to fetch sender info when creating new record
  React.useEffect(() => {
    const fetchSenderInfo = async () => {
      if (isNew && senderId) {
        try {
          const parsedSenderId = parseInt(senderId)
          if (isNaN(parsedSenderId)) {
            setError(`Invalid sender ID format: ${senderId}`)
            return
          }

          type DBSender = {
            id: number
            sender: string
            cta: string | null
          }

          const { data, error: senderError } = await supabase
            .from('sender')
            .select('id, sender, cta')
            .eq('id', parsedSenderId)
            .single()

          if (senderError) {
            console.error('Error fetching sender:', senderError)
            setError(`Failed to fetch sender information: ${senderError.message}`)
            return
          }

          if (!data) {
            setError('Sender not found')
            return
          }

          const dbData = data as DBSender
          const senderData: SenderRecord = {
            id: dbData.id,
            sender: dbData.sender,
            cta: dbData.cta || ''
          }

          setSenderInfo(senderData)
          setLoading(false)
        } catch (error) {
          console.error('Error in fetchSenderInfo:', error)
          setError('Failed to load sender information')
        }
      }
    }

    fetchSenderInfo()
  }, [isNew, senderId])

  const fetchStatuses = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sender_status')
        .select('id, status')
        .order('id')

      if (error) throw error
      console.log('Available statuses:', data)
      setStatuses((data || []) as Status[])
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
      setProviders((data || []) as Provider[])
    } catch (error) {
      console.error('Error fetching providers:', error)
      toast.error('Failed to load providers')
    }
  }, [])

  const fetchTollFree = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!id) {
        throw new Error('Invalid toll-free ID')
      }

      const parsedId = parseInt(id)
      if (isNaN(parsedId)) {
        throw new Error(`Invalid toll-free ID format: ${id}`)
      }

      console.log('Fetching toll-free record with ID:', parsedId)

      // Step 1: Fetch the toll-free record first
      const { data: tollFreeData, error: tollFreeError } = await supabase
        .from('toll_free')
        .select('*')
        .eq('id', parsedId)
        .single()

      if (tollFreeError) {
        console.error('Toll-free fetch error:', {
          error: tollFreeError,
          id: parsedId,
          rawId: id
        })
        throw new Error(`Failed to fetch toll-free record: ${tollFreeError.message}`)
      }

      if (!tollFreeData) {
        throw new Error('Toll-free record not found')
      }

      const tollFree = tollFreeData as unknown as TollFreeRecord
      console.log('Raw toll-free data:', tollFreeData)

      // Step 2: Fetch related records based on toll-free data
      const [
        { data: statusData },
        { data: providerData },
        { data: senderData }
      ] = await Promise.all([
        // Get status
        supabase
          .from('sender_status')
          .select('id, status')
          .eq('id', tollFree.status_id)
          .single(),
        // Get provider if exists
        tollFree.provider_id ? 
          supabase
            .from('provider')
            .select('providerid, provider_name')
            .eq('providerid', tollFree.provider_id)
            .single() : 
          Promise.resolve({ data: null }),
        // Get sender
        supabase
          .from('sender')
          .select('id, sender, cta')
          .eq('id', tollFree.sender_id)
          .single()
      ])

      const status = statusData as unknown as StatusRecord
      const provider = providerData as unknown as ProviderRecord | null
      const sender = senderData as unknown as SenderRecord

      // Step 3: Fetch both initial and finalized samples
      const [{ data: initialSamplesData }, { data: finalizedSamplesData }] = await Promise.all([
        // Get initial samples from the view
        supabase
          .from('toll_free_sms_samples')
          .select('sample1, sample2, sample3')
          .eq('id', parsedId)
          .single(),
        // Get finalized samples from the table
        supabase
          .from('toll_free_samples')
          .select('sample_copy1, sample_copy2, sample_copy3')
          .eq('id', parsedId)
          .single()
      ])

      const initialSamples = initialSamplesData as InitialSamples | null
      const finalizedSamples = finalizedSamplesData as FinalizedSamples | null

      // Step 4: Transform and set the data
      const transformedData: TollFree = {
        id: tollFree.id,
        did: tollFree.did || '',
        sender_id: tollFree.sender_id,
        sender: {
          id: sender?.id || 0,
          sender: sender?.sender || '',
          cta: sender?.cta || ''
        },
        status_id: tollFree.status_id,
        status: {
          id: status?.id || 0,
          status: status?.status || 'Unknown'
        },
        provider_id: tollFree.provider_id,
        provider: provider ? {
          providerid: provider.providerid,
          provider_name: provider.provider_name
        } : null,
        campaignid_tcr: tollFree.campaignid_tcr,
        use_case: tollFree.use_case,
        brief: tollFree.brief,
        submitteddate: tollFree.submitteddate,
        notes: tollFree.notes,
        initialSamples: initialSamples ? {
          sample1: initialSamples.sample1,
          sample2: initialSamples.sample2,
          sample3: initialSamples.sample3
        } : null,
        finalizedSamples: finalizedSamples ? {
          sample_copy1: finalizedSamples.sample_copy1,
          sample_copy2: finalizedSamples.sample_copy2,
          sample_copy3: finalizedSamples.sample_copy3
        } : null
      }

      setTollFree(transformedData)
    } catch (error) {
      console.error('Error fetching toll-free number:', error)
      setError(error instanceof Error ? error.message : 'Failed to load toll-free number')
    } finally {
      setLoading(false)
    }
  }, [id])

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
      console.log('Saving samples for toll-free:', {
        id: tollFree.id,
        editedSamples
      })

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      // Call the Edge Function to handle sample updates
      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/update-toll-free-samples', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tollFreeId: tollFree.id,
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
            .from('toll_free')
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
        
        // Create basic toll-free record with required fields
        const newTollFreeData = {
          sender_id: parsedSenderId,
          sender: senderData.sender,
          status_id: 5, // Default status
          did: didValue && didValue.trim() !== '' ? didValue : null,
          lastmodified: new Date().toISOString()
        }

        console.log('Attempting to create new toll-free record with data:', newTollFreeData)

        const { data, error: createError } = await supabase
          .from('toll_free')
          .insert([newTollFreeData])
          .select('*')
          .single()

        if (createError) {
          console.error('Database error creating toll-free record:', {
            error: createError,
            data: newTollFreeData,
            errorMessage: createError.message,
            details: createError.details,
            hint: createError.hint
          })
          throw new Error(`Failed to create toll-free record: ${createError.message}`)
        }

        if (!data) {
          console.error('No data returned from insert')
          throw new Error('Failed to create toll-free record: No data returned')
        }

        console.log('Successfully created toll-free record:', data)
        toast.success('New toll-free record created')
        navigate(`/dashboard/maintenance/toll-free/${data.id}`)
        return
      }

      // For existing records, update with all fields
      const updates = {
        status_id: parseInt(formData.get('status_id') as string),
        provider_id: parseInt(formData.get('provider_id') as string) || null,
        campaignid_tcr: formData.get('campaignid_tcr') as string || null,
        use_case: formData.get('use_case') as string || null,
        brief: formData.get('brief') as string || null,
        notes: formData.get('notes') as string || null,
        // Set submitteddate when status changes to 7 (Submitted) and a date was not previously set
        ...(parseInt(formData.get('status_id') as string) === 7 && !tollFree?.submitteddate && {
          submitteddate: formData.get('submitteddate') as string
        })
      }

      const { error } = await supabase
        .from('toll_free')
        .update(updates)
        .eq('id', parseInt(id || ''))

      if (error) {
        if (error.message.includes('value too long for type character varying(255)')) {
          toast.error('Use case content is too long. Please shorten it to less than 255 characters.');
          return;
        }
        throw error;
      }

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
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
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

  const generateUseCase = React.useCallback(async () => {
    try {
      if (!tollFree) return;
      
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
      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/generate-use-case', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: tollFree.id
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
  }, [tollFree]);

  React.useEffect(() => {
    fetchStatuses()
    fetchProviders()
    // Only fetch toll-free data if we're not creating a new record
    if (!isNew) {
      fetchTollFree()
    }
  }, [fetchStatuses, fetchProviders, fetchTollFree, isNew])

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

  if (!isNew && !tollFree) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-red-600">Toll-free number not found</div>
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
              onClick={() => navigate('/dashboard/maintenance/toll-free')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{isNew ? 'New' : 'Edit'} Toll-Free Number</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 rounded-lg border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sender</Label>
              <Input value={isNew ? senderInfo?.sender || '' : tollFree?.sender?.sender || ''} disabled />
            </div>
            <div>
              <Label>DID</Label>
              <Input 
                name="did"
                defaultValue={tollFree?.did || ''}
                disabled={tollFree?.status_id !== 2} // Only enable when status is Approved (id: 2)
                placeholder="Enter DID when approved"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status_id" defaultValue={isNew ? "5" : tollFree?.status_id.toString()}>
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
            {(tollFree?.submitteddate || tollFree?.status_id === 7) && (
              <div className="space-y-2">
                <Label>Submitted Date</Label>
                {tollFree?.submitteddate ? (
                  <Input 
                    value={new Date(tollFree.submitteddate).toISOString().split('T')[0]} 
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
              <Select name="provider_id" defaultValue={tollFree?.provider_id?.toString()}>
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
            <div className="flex items-center justify-between">
              <Label>Use Case</Label>
              {tollFree && tollFree.use_case && (
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
                        name="use_case"
                        value={editedUseCase || tollFree.use_case || ""}
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
                            .from('toll_free')
                            .update({ use_case: editedUseCase || tollFree.use_case || "" })
                            .eq('id', tollFree.id)
                          
                          if (error) throw error
                          
                          toast.success("Use case updated successfully")
                          setIsEditDialogOpen(false)
                          setEditedUseCase("")
                          fetchTollFree()
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
            {tollFree?.use_case ? (
              <Textarea 
                name="use_case"
                defaultValue={tollFree.use_case}
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
                      name="use_case"
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
                      {tollFree && (
                        <Button
                          className="flex-1"
                          onClick={async () => {
                            try {
                              console.log('Attempting to save use case:', {
                                id: tollFree?.id,
                                useCase: generatedUseCase
                              });

                              const { data, error } = await supabase
                                .from('toll_free')
                                .update({ 
                                  use_case: generatedUseCase,
                                  lastmodified: new Date().toISOString()
                                })
                                .eq('id', tollFree?.id)
                                .select()
                                .single();

                              if (error) {
                                console.error('Error updating use case:', {
                                  error,
                                  details: error.details,
                                  hint: error.hint,
                                  message: error.message
                                });
                                throw error;
                              }

                              if (!data) {
                                throw new Error('No data returned from update');
                              }

                              console.log('Successfully updated use case:', data);
                              
                              // Update the tollFree state with the new use case
                              setTollFree(prev => prev ? {
                                ...prev,
                                use_case: generatedUseCase
                              } : null);
                              
                              toast.success("Use case saved successfully");
                              setGeneratedUseCase(""); // Clear the generated use case
                              
                              // Force a refresh of the data
                              await fetchTollFree();
                            } catch (error) {
                              console.error('Error saving use case:', error);
                              toast.error(error instanceof Error ? error.message : "Failed to save use case");
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
            <Label>Brief</Label>
            <div className="space-y-4">
              {!tollFree?.brief ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateBrief}
                  disabled={isGeneratingBrief}
                >
                  {isGeneratingBrief ? 'Generating...' : 'Generate Brief'}
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  <Input type="file" id="brief" name="brief" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tollFree?.brief) {
                        const url = `https://miahiaqsjpnrppiusdvg.supabase.co/storage/v1/object/public/briefs/${tollFree.brief}`;
                        window.open(url, '_blank');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Brief
                  </Button>
                </div>
              )}
            </div>
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
                    {tollFree?.finalizedSamples ? "SMS Sample Copy" : "Generate SMS Copy"}
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
                              onClick={saveSampleEdits}
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
                    ) : tollFree?.initialSamples && !tollFree?.finalizedSamples ? (
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
                              <p className="text-sm">{tollFree.initialSamples.sample1}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Initial Sample 2</Label>
                            <div className="rounded-md border p-2 bg-gray-50">
                              <p className="text-sm">{tollFree.initialSamples.sample2}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Initial Sample 3</Label>
                            <div className="rounded-md border p-2 bg-gray-50">
                              <p className="text-sm">{tollFree.initialSamples.sample3}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button
                            type="button"
                            className="w-full"
                            disabled={spinSamples?.isGenerating}
                            onClick={() => generateSpinSamples(tollFree.id)}
                          >
                            {spinSamples?.isGenerating ? "Generating..." : "Generate New Samples"}
                          </Button>
                        </div>
                      </>
                    ) : tollFree?.finalizedSamples ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Current Message Copies</span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditedSamples({
                                sample_copy1: tollFree.finalizedSamples?.sample_copy1 || null,
                                sample_copy2: tollFree.finalizedSamples?.sample_copy2 || null,
                                sample_copy3: tollFree.finalizedSamples?.sample_copy3 || null,
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
                              <p className="text-sm">{tollFree.finalizedSamples.sample_copy1}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 2</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tollFree.finalizedSamples.sample_copy2}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 3</Label>
                            <div className="rounded-md border p-2">
                              <p className="text-sm">{tollFree.finalizedSamples.sample_copy3}</p>
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

        <DataTable
          columns={columns}
          data={tollFreeData || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}