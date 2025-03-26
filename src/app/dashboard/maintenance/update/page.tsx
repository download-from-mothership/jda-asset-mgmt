"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Phone, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { toast, Toaster } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useSearchParams, useNavigate } from "react-router-dom"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

type TollFree = {
  id: number
  did: string
  sender_id: number
}

type TenDLC = {
  id: number
  did: string
  sender_id: number
}

type Sender = {
  id: number
  sender: string
  shorturl: string | null
  brand: string | null
  company: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cta: string | null
  terms: string | null
  privacypolicy: string | null
  toll_free?: TollFree | null
  tendlc?: TenDLC | null
}

type Vertical = {
  id: number
  vertical_name: string
}

type Company = {
  company_name: string;
}

const updateSenderSchema = z.object({
  sender: z.string().min(2, {
    message: "Sender name must be at least 2 characters.",
  }),
  shorturl: z.string().nullable(),
  brand: z.string().nullable(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  cta: z.string().nullable(),
  terms: z.string().nullable(),
  privacypolicy: z.string().nullable(),
})

type FormValues = z.infer<typeof updateSenderSchema>

export default function UpdateRecordPage() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [senders, setSenders] = React.useState<Sender[]>([])
  const [selectedSender, setSelectedSender] = React.useState<Sender | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [verticals, setVerticals] = React.useState<Vertical[]>([])
  const [selectedVerticals, setSelectedVerticals] = React.useState<Vertical[]>([])
  const [verticalsOpen, setVerticalsOpen] = React.useState(false)
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [companySearch, setCompanySearch] = React.useState("")
  const [urlStatus, setUrlStatus] = React.useState<'live' | 'not live' | null>(null)
  const searchParams = useSearchParams()[0]
  const navigate = useNavigate()
  const [tollFree, setTollFree] = React.useState<TollFree | null>(null)
  const [tenDLC, setTenDLC] = React.useState<TenDLC | null>(null)

  const { register, handleSubmit, setValue: setFormValue } = useForm<FormValues>({
    resolver: zodResolver(updateSenderSchema)
  })

  // Add function to check URL status
  const checkUrlStatus = React.useCallback(async (url: string) => {
    try {
      // Remove any existing protocol or www prefix
      const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
      console.log('Checking URL status for:', cleanUrl)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No access token available')
        return
      }

      const response = await fetch('https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/check-url-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url: cleanUrl })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('URL status response:', data)
      setUrlStatus(data.status)
    } catch (error) {
      console.error('Error checking URL status:', error)
      setUrlStatus('not live')
    }
  }, [])

  // Modify useEffect to check URL status when sender is selected
  React.useEffect(() => {
    if (selectedSender?.shorturl) {
      checkUrlStatus(selectedSender.shorturl)
    } else {
      setUrlStatus(null)
    }
  }, [selectedSender, checkUrlStatus])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch senders with toll-free and tendlc relationships
        const { data: sendersData, error: sendersError } = await supabase
          .from('sender')
          .select(`
            *,
            toll_free:toll_free!fk_toll_free_sender_id (
              id,
              did,
              status_id,
              lastmodified
            ),
            tendlc:tendlc!fk_tendlc_sender_id (
              id,
              did,
              status_id,
              lastmodified
            )
          `)
          .order('sender', { ascending: true })

        if (sendersError) {
          console.error('Error fetching senders:', sendersError)
          throw new Error(`Failed to fetch senders: ${sendersError.message}`)
        }

        if (!sendersData) {
          throw new Error('No sender data received')
        }

        const typedSenders = sendersData.map(sender => {
          // Get the most recent toll-free record if there are multiple
          const tollFreeRecords = Array.isArray(sender.toll_free) ? sender.toll_free : [sender.toll_free];
          const mostRecentTollFree = tollFreeRecords
            .filter(tf => tf) // Remove null entries
            .sort((a, b) => {
              const dateA = new Date(a.lastmodified || 0);
              const dateB = new Date(b.lastmodified || 0);
              return dateB.getTime() - dateA.getTime();
            })[0];

          // Get the most recent 10DLC record if there are multiple
          const tenDLCRecords = Array.isArray(sender.tendlc) ? sender.tendlc : [sender.tendlc];
          console.log('10DLC records for sender', sender.id, ':', tenDLCRecords)
          const mostRecentTenDLC = tenDLCRecords
            .filter(td => td) // Remove null entries
            .sort((a, b) => {
              const dateA = new Date(a.lastmodified || 0);
              const dateB = new Date(b.lastmodified || 0);
              return dateB.getTime() - dateA.getTime();
            })[0];
          console.log('Most recent 10DLC for sender', sender.id, ':', mostRecentTenDLC)

          return {
            id: sender.id as number,
            sender: sender.sender as string,
            shorturl: sender.shorturl as string | null,
            brand: sender.brand as string | null,
            company: sender.company as string | null,
            phone: sender.phone as string | null,
            address: sender.address as string | null,
            city: sender.city as string | null,
            state: sender.state as string | null,
            zip: sender.zip as string | null,
            cta: sender.cta as string | null,
            terms: sender.terms as string | null,
            privacypolicy: sender.privacypolicy as string | null,
            toll_free: mostRecentTollFree ? {
              id: mostRecentTollFree.id as number,
              did: mostRecentTollFree.did as string,
              sender_id: sender.id as number
            } : null,
            tendlc: mostRecentTenDLC ? {
              id: mostRecentTenDLC.id as number,
              did: mostRecentTenDLC.did as string,
              sender_id: sender.id as number
            } : null
          };
        }) as Sender[]
        console.log('Processed senders with 10DLC data:', typedSenders)
        setSenders(typedSenders)

        // Fetch verticals
        const { data: verticalsData, error: verticalsError } = await supabase
          .from('vertical')
          .select('*')
          .order('vertical_name', { ascending: true })

        if (verticalsError) {
          console.error('Error fetching verticals:', verticalsError)
          throw new Error(`Failed to fetch verticals: ${verticalsError.message}`)
        }

        if (!verticalsData) {
          throw new Error('No verticals data received')
        }

        const typedVerticals = verticalsData.map(vertical => ({
          id: vertical.id as number,
          vertical_name: vertical.vertical_name as string
        }))
        setVerticals(typedVerticals)

        // Fetch companies
        const { data: companiesData, error: companiesError } = await supabase
          .from('company')
          .select('company_name')
          .order('company_name')

        if (companiesError) {
          console.error('Error fetching companies:', companiesError)
          throw new Error(`Failed to fetch companies: ${companiesError.message}`)
        }

        if (!companiesData) {
          throw new Error('No companies data received')
        }

        const typedCompanies = companiesData.map(company => ({
          company_name: company.company_name as string
        }))
        setCompanies(typedCompanies)

        // Check for sender ID in URL and select it after data is loaded
        const senderId = searchParams.get('id')
        if (senderId) {
          const selected = typedSenders.find(s => s.id.toString() === senderId)
          if (!selected) {
            console.error('Selected sender not found:', senderId)
            throw new Error(`Sender with ID ${senderId} not found`)
          }

          setSelectedSender(selected)
          setValue(senderId)
          setTollFree(selected.toll_free || null)
          setTenDLC(selected.tendlc || null)

          // Fetch verticals for this sender
          const { data: senderVerticals, error: verticalError } = await supabase
            .from('sender_vertical')
            .select(`
              sender_id,
              vertical:vertical_id (
                id,
                vertical_name
              )
            `)
            .eq('sender_id', selected.id)

          if (verticalError) {
            console.error('Error fetching sender verticals:', verticalError)
            throw new Error(`Failed to fetch sender verticals: ${verticalError.message}`)
          }

          if (!senderVerticals) {
            console.warn('No verticals found for sender:', selected.id)
            setSelectedVerticals([])
          } else {
            console.log('Raw sender verticals response:', senderVerticals)

            const verticalsList = ((senderVerticals as unknown as Array<{
              sender_id: number;
              vertical: {
                id: number;
                vertical_name: string;
              } | null;
            }>) || [])
              .filter(sv => sv.vertical !== null)
              .map(sv => ({
                id: sv.vertical!.id,
                vertical_name: sv.vertical!.vertical_name
              }))

            console.log('Processed verticals list:', verticalsList)
            setSelectedVerticals(verticalsList)
          }

          // Set form values
          Object.entries(selected).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'toll_free') {
              setFormValue(key as keyof FormValues, value as string | null)
            }
          })
        }
      } catch (error) {
        console.error('Error in fetchData:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [searchParams, setFormValue])

  const handleSenderSelect = async (senderId: string) => {
    const selected = senders.find(s => s.id.toString() === senderId)
    if (!selected) {
      console.error('Selected sender not found:', senderId)
      toast.error('Selected sender not found')
      return
    }

    console.log('Selected sender:', selected)
    console.log('Selected sender 10DLC:', selected.tendlc)
    console.log('Selected sender toll-free:', selected.toll_free)

    setSelectedSender(selected)
    setValue(senderId)
    setTollFree(selected.toll_free || null)
    setTenDLC(selected.tendlc || null)
    console.log('Setting 10DLC state:', selected.tendlc || null)
    setOpen(false)

    // Fetch verticals for this sender
    try {
      const { data: senderVerticals, error } = await supabase
        .from('sender_vertical')
        .select(`
          sender_id,
          vertical:vertical_id (
            id,
            vertical_name
          )
        `)
        .eq('sender_id', selected.id)

      if (error) {
        console.error('Error fetching sender verticals:', error)
        throw error
      }

      if (!senderVerticals) {
        console.warn('No verticals found for sender:', selected.id)
        setSelectedVerticals([])
      } else {
        console.log('Raw sender verticals response:', senderVerticals)

        const verticalsList = ((senderVerticals as unknown as Array<{
          sender_id: number;
          vertical: {
            id: number;
            vertical_name: string;
          } | null;
        }>) || [])
          .filter(sv => sv.vertical !== null)
          .map(sv => ({
            id: sv.vertical!.id,
            vertical_name: sv.vertical!.vertical_name
          }))

        console.log('Processed verticals list:', verticalsList)
        setSelectedVerticals(verticalsList)
      }

      // Set form values
      Object.entries(selected).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'toll_free') {
          setFormValue(key as keyof FormValues, value as string | null)
        }
      })
    } catch (error) {
      console.error('Error fetching sender verticals:', error)
      toast.error('Failed to load sender verticals')
    }
  }

  const onSubmit = async (data: FormValues) => {
    if (!selectedSender) return

    try {
      // Update sender table
      const { error: updateError } = await supabase
        .from('sender')
        .update({
          ...data,
          lastmodified: new Date().toISOString(),
        })
        .eq('id', selectedSender.id)

      if (updateError) {
        console.error('Error updating sender:', updateError)
        throw new Error(`Failed to update sender: ${updateError.message}`)
      }

      // Update sender_vertical relationships
      const { error: deleteError } = await supabase
        .from('sender_vertical')
        .delete()
        .eq('sender_id', selectedSender.id)

      if (deleteError) {
        console.error('Error deleting existing verticals:', deleteError)
        throw new Error(`Failed to delete existing verticals: ${deleteError.message}`)
      }

      if (selectedVerticals.length > 0) {
        const verticalInserts = selectedVerticals.map(v => ({
          sender_id: selectedSender.id,
          vertical_id: v.id
        }))

        console.log('Inserting new verticals:', verticalInserts)

        const { error: insertError } = await supabase
          .from('sender_vertical')
          .insert(verticalInserts)

        if (insertError) {
          console.error('Error inserting new verticals:', insertError)
          throw new Error(`Failed to insert new verticals: ${insertError.message}`)
        }
      }

      toast.success('Sender updated successfully')
      
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating sender:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update sender')
    }
  }

  const toggleVertical = (vertical: Vertical) => {
    setSelectedVerticals(current => {
      const exists = current.find(v => v.id === vertical.id)
      if (exists) {
        return current.filter(v => v.id !== vertical.id)
      }
      return [...current, vertical]
    })
  }

  const filteredCompanies = companySearch
    ? companies.filter((company) =>
        company.company_name.toLowerCase().includes(companySearch.toLowerCase())
      )
    : companies

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <main className="flex min-h-screen flex-col items-start p-2">
        <div className="flex-1 space-y-1 w-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Update Record</h2>
            {urlStatus && (
              <Badge 
                variant={urlStatus === 'live' ? 'success' : 'destructive'}
                className="ml-2"
              >
                {urlStatus === 'live' ? 'Live' : 'Not Live'}
              </Badge>
            )}
          </div>
          <div className="space-y-2 border rounded-lg p-3 bg-background">
            <div className="space-y-1">
              <label className="text-sm font-medium">Select Sender *</label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {value
                      ? senders.find((sender) => sender.id.toString() === value)?.sender
                      : "Select sender..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search sender..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No sender found.</CommandEmpty>
                      <CommandGroup>
                        {senders.map((sender) => (
                          <CommandItem
                            key={sender.id}
                            value={sender.id.toString()}
                            onSelect={handleSenderSelect}
                          >
                            {sender.sender}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                value === sender.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedSender && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Short URL</label>
                    <Input
                      placeholder="Enter short URL"
                      {...register("shorturl")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Brand</label>
                    <Input
                      placeholder="Enter brand"
                      {...register("brand")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Verticals *</label>
                    <Popover open={verticalsOpen} onOpenChange={setVerticalsOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={verticalsOpen}
                          className="w-full justify-between"
                        >
                          {selectedVerticals.length > 0
                            ? `${selectedVerticals.length} selected`
                            : "Select verticals..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search verticals..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No verticals found.</CommandEmpty>
                            <CommandGroup>
                              {verticals.map((vertical) => (
                                <CommandItem
                                  key={vertical.id}
                                  value={vertical.vertical_name}
                                  onSelect={() => toggleVertical(vertical)}
                                >
                                  {vertical.vertical_name}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      selectedVerticals.some(v => v.id === vertical.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedVerticals.map(vertical => (
                        <Badge
                          key={vertical.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {vertical.vertical_name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => toggleVertical(vertical)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Company</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !selectedSender?.company && "text-muted-foreground"
                          )}
                        >
                          {selectedSender?.company || "Select company"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search company..."
                            value={companySearch}
                            onValueChange={setCompanySearch}
                          />
                          <CommandList>
                            <CommandEmpty>No company found.</CommandEmpty>
                            <CommandGroup>
                              {filteredCompanies.map((company) => (
                                <CommandItem
                                  key={company.company_name}
                                  value={company.company_name}
                                  onSelect={(value) => {
                                    setFormValue("company", value)
                                    if (selectedSender) {
                                      setSelectedSender({
                                        ...selectedSender,
                                        company: value
                                      })
                                    }
                                    setCompanySearch("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSender?.company === company.company_name
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {company.company_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="footer-details">
                    <AccordionTrigger>Footer Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Address</label>
                          <Input
                            placeholder="Enter address"
                            {...register("address")}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">City</label>
                            <Input
                              placeholder="Enter city"
                              {...register("city")}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium">State</label>
                            <Input
                              placeholder="State"
                              {...register("state")}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Zip</label>
                            <Input
                              placeholder="ZIP code"
                              {...register("zip")}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Phone</label>
                          <Input
                            placeholder="Enter phone number"
                            {...register("phone")}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="links">
                    <AccordionTrigger>Links</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">CTA</label>
                          <Input
                            placeholder="Enter CTA"
                            {...register("cta")}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">T&C</label>
                            <Input
                              placeholder="Enter terms and conditions"
                              {...register("terms")}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Privacy Policy</label>
                            <Input
                              placeholder="Enter privacy policy"
                              {...register("privacypolicy")}
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex justify-between gap-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={tollFree ? "secondary" : "outline"}
                      onClick={() => {
                        if (selectedSender) {
                          if (tollFree?.id) {
                            navigate(`/dashboard/maintenance/toll-free/${tollFree.id}`)
                          } else {
                            navigate(`/dashboard/maintenance/toll-free/new?sender_id=${selectedSender.id}`)
                          }
                        }
                      }}
                      disabled={!selectedSender}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {tollFree ? "Toll-Free" : "Add Toll-Free"}
                    </Button>
                    <Button
                      type="button"
                      variant={tenDLC ? "secondary" : "outline"}
                      onClick={() => {
                        if (selectedSender) {
                          if (tenDLC?.id) {
                            navigate(`/dashboard/maintenance/10dlc/${tenDLC.id}`)
                          } else {
                            navigate(`/dashboard/maintenance/10dlc/new?sender_id=${selectedSender.id}`)
                          }
                        }
                      }}
                      disabled={!selectedSender}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {tenDLC ? "10DLC" : "Add 10DLC"}
                    </Button>
                  </div>
                  <Button type="submit">Update</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  )
} 