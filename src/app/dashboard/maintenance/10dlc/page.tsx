"use client"

import * as React from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Toaster, toast } from "sonner"
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

interface Status {
  id: number
  status: string
}

interface Provider {
  providerid: number
  provider_name: string
}

interface SenderData {
  id: number
  sender: string
  cta: string
  brand: string
  shorturl: string
}

interface InitialSamplesData {
  sample1: string | null
  sample2: string | null
  sample3: string | null
}

interface FinalizedSamplesData {
  sample_copy1: string | null
  sample_copy2: string | null
  sample_copy3: string | null
}

interface TenDLC {
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
  sender: SenderData
  initialSamples: InitialSamplesData | null
  finalizedSamples: FinalizedSamplesData | null
}

interface ProcessingStatus {
  isProcessing: boolean
  step: number
  message: string
}

export default function TenDLCPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = id === 'new'
  const senderId = isNew ? searchParams.get('sender_id') : null
  const [tenDLC, setTenDLC] = React.useState<TenDLC | null>(null)
  const [isEditingSamples, setIsEditingSamples] = React.useState(false)
  const [editedSamples, setEditedSamples] = React.useState<FinalizedSamplesData | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editedUseCase, setEditedUseCase] = React.useState("")
  const [generatedUseCase, setGeneratedUseCase] = React.useState<string>("")
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [processingStatus, setProcessingStatus] = React.useState<ProcessingStatus>({
    isProcessing: false,
    step: 0,
    message: ''
  })

  // Fetch statuses
  const { data: statuses, isLoading: isLoadingStatuses } = useQuery<Status[]>({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status')
        .select('*')
        .order('id')

      if (error) throw error
      return (data as unknown as { id: number, status: string }[]).map(item => ({
        id: Number(item.id),
        status: String(item.status)
      })) as Status[]
    }
  })

  // Fetch providers
  const { data: providers, isLoading: isLoadingProviders } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider')
        .select('*')
        .order('id')

      if (error) throw error
      return (data as unknown as { providerid: number, provider_name: string }[]).map(item => ({
        providerid: Number(item.providerid),
        provider_name: String(item.provider_name)
      })) as Provider[]
    }
  })

  const isLoading = isLoadingStatuses || isLoadingProviders

  const fetchTenDLC = React.useCallback(async () => {
    if (!id) return;

    try {
      const { data, error: tendlcError } = await supabase
        .from('tendlc')
        .select(`
          *,
          tendlc_sms_samples (
            sample1,
            sample2,
            sample3
          ),
          tendlc_samples (
            sample_copy1,
            sample_copy2,
            sample_copy3
          ),
          sender:sender_id (
            id,
            sender,
            cta,
            brand,
            shorturl
          )
        `)
        .eq('id', Number(id))
        .single()

      if (tendlcError) {
        throw new Error(tendlcError.message)
      }

      if (!data) {
        throw new Error('No data found')
      }

      const initialSamplesData = data.tendlc_sms_samples?.[0] as unknown as InitialSamplesData | null
      const finalizedSamplesData = data.tendlc_samples?.[0] as unknown as FinalizedSamplesData | null
      const senderData = data.sender as unknown as SenderData

      const tenDLCData: TenDLC = {
        id: Number(data.id),
        did: data.did as string | null,
        business_name: data.business_name as string | null,
        status_id: Number(data.status_id),
        provider_id: data.provider_id ? Number(data.provider_id) : null,
        campaignid_tcr: data.campaignid_tcr as string | null,
        use_case: data.use_case as string | null,
        use_case_helper: data.use_case_helper as string | null,
        brief: data.brief ? Number(data.brief) : null,
        submitteddate: data.submitteddate as string | null,
        notes: data.notes as string | null,
        lastmodified: data.lastmodified as string,
        modified_by: data.modified_by as string | null,
        modified_by_name: data.modified_by_name as string | null,
        sender_id: data.sender_id ? Number(data.sender_id) : null,
        sender: senderData,
        initialSamples: initialSamplesData,
        finalizedSamples: finalizedSamplesData
      }

      setTenDLC(tenDLCData)
    } catch (error) {
      console.error('Error fetching 10DLC:', error)
      toast.error('Failed to load 10DLC data')
    }
  }, [id])

  React.useEffect(() => {
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
            business_name: null,
            sender_id: parseInt(senderId),
            sender: {
              id: Number(senderData.id),
              sender: String(senderData.sender),
              cta: String(senderData.cta),
              brand: String(senderData.brand),
              shorturl: String(senderData.shorturl)
            },
            status_id: 5, // Set to 5 for new records
            provider_id: null,
            campaignid_tcr: null,
            use_case: null,
            use_case_helper: null,
            brief: null,
            submitteddate: null,
            notes: null,
            lastmodified: new Date().toISOString(),
            modified_by: null,
            modified_by_name: null,
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
  }, [fetchTenDLC, isNew, senderId])

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

        if (!tenDLC) {
          throw new Error('10DLC data is required')
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
          sender: String(tenDLC.sender.sender),
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

  const handleSpinSamples = async () => {
    if (!tenDLC?.initialSamples) return;

    try {
      setProcessingStatus({
        isProcessing: true,
        step: 0,
        message: 'Generating optimized samples...'
      });

      const sample1 = tenDLC.initialSamples.sample1?.replace('[brand]', tenDLC.sender.brand)
        .replace('[shorturl]', tenDLC.sender.shorturl) || ''
      const sample2 = tenDLC.initialSamples.sample2?.replace('[brand]', tenDLC.sender.brand)
        .replace('[shorturl]', tenDLC.sender.shorturl) || ''
      const sample3 = tenDLC.initialSamples.sample3?.replace('[brand]', tenDLC.sender.brand)
        .replace('[shorturl]', tenDLC.sender.shorturl) || ''

      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      // Call the Edge Function to handle sample generation
      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/generate-tendlc-samples', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenDLCId: tenDLC.id,
          samples: {
            sample1,
            sample2,
            sample3
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Edge Function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Failed to generate samples: ${errorText}`)
      }

      const result = await response.json()
      console.log('Generation result:', result)

      // Update the tenDLC state with the generated samples
      setTenDLC(prev => prev ? {
        ...prev,
        finalizedSamples: {
          sample_copy1: result.sample1,
          sample_copy2: result.sample2,
          sample_copy3: result.sample3
        }
      } : null)

      toast.success('Samples generated successfully')
    } catch (error) {
      console.error('Error generating samples:', error)
      toast.error('Failed to generate samples')
    } finally {
      setProcessingStatus({
        isProcessing: false,
        step: 0,
        message: ''
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
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
              <Select
                value={tenDLC?.status_id?.toString() || ''}
                onValueChange={(value) => {
                  setTenDLC(prev => prev ? {
                    ...prev,
                    status_id: Number(value)
                  } : null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses?.map((status) => (
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
              <Select
                value={tenDLC?.provider_id?.toString() || ''}
                onValueChange={(value) => {
                  setTenDLC(prev => prev ? {
                    ...prev,
                    provider_id: value ? Number(value) : null
                  } : null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map((provider) => (
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
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" onClick={() => setIsPopoverOpen(true)}>
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
                              onChange={(e) => setEditedSamples(prev => prev ? { ...prev, sample_copy1: e.target.value } : null)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 2</Label>
                            <Textarea
                              value={editedSamples?.sample_copy2 || ''}
                              onChange={(e) => setEditedSamples(prev => prev ? { ...prev, sample_copy2: e.target.value } : null)}
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sample 3</Label>
                            <Textarea
                              value={editedSamples?.sample_copy3 || ''}
                              onChange={(e) => setEditedSamples(prev => prev ? { ...prev, sample_copy3: e.target.value } : null)}
                              className="min-h-[100px]"
                            />
                          </div>
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
                            onClick={() => handleSpinSamples()}
                          >
                            {processingStatus.isProcessing ? "Generating..." : "Generate New Samples"}
                          </Button>
                        </div>
                      </>
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