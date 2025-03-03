"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

type TollFree = {
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
}

type Vertical = {
  id: number
  vertical_name: string
}

type FormValues = Omit<Sender, 'id'> & {
  verticals: number[]
}

export default function UpdateRecordPage() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [senders, setSenders] = React.useState<Sender[]>([])
  const [selectedSender, setSelectedSender] = React.useState<Sender | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [verticals, setVerticals] = React.useState<Vertical[]>([])
  const [selectedVerticals, setSelectedVerticals] = React.useState<Vertical[]>([])
  const [verticalsOpen, setVerticalsOpen] = React.useState(false)
  const searchParams = useSearchParams()[0]
  const navigate = useNavigate()
  const [tollFree, setTollFree] = React.useState<TollFree | null>(null)

  const { register, handleSubmit, setValue: setFormValue, formState: { errors } } = useForm<FormValues>()

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch senders with toll_free relationship
        const { data: sendersData, error: sendersError } = await supabase
          .from('sender')
          .select('*, toll_free(*)')
          .order('sender', { ascending: true })

        if (sendersError) throw sendersError
        setSenders(sendersData || [])

        // Fetch verticals
        const { data: verticalsData, error: verticalsError } = await supabase
          .from('vertical')
          .select('*')
          .order('vertical_name', { ascending: true })

        if (verticalsError) throw verticalsError
        setVerticals(verticalsData || [])

        // Check for sender ID in URL and select it after data is loaded
        const senderId = searchParams.get('id')
        if (senderId && sendersData) {
          const selected = sendersData.find(s => s.id.toString() === senderId)
          if (selected) {
            setSelectedSender(selected)
            setValue(senderId)
            setTollFree(selected.toll_free)

            // Fetch verticals for this sender
            const { data: senderVerticals, error: verticalError } = await supabase
              .from('sender_vertical')
              .select('vertical:vertical_id (id, vertical_name)')
              .eq('sender_id', selected.id)

            if (verticalError) throw verticalError

            const verticalsList = senderVerticals
              .map(sv => sv.vertical)
              .filter((v): v is Vertical => v !== null)

            setSelectedVerticals(verticalsList)

            // Set form values
            Object.entries(selected).forEach(([key, value]) => {
              if (key !== 'id') {
                setFormValue(key as keyof FormValues, value)
              }
            })
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
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

    setSelectedSender(selected)
    setValue(senderId)
    setTollFree(selected.toll_free)
    setOpen(false)

    // Fetch verticals for this sender
    try {
      const { data: senderVerticals, error } = await supabase
        .from('sender_vertical')
        .select('vertical:vertical_id (id, vertical_name)')
        .eq('sender_id', selected.id)

      if (error) throw error

      const verticalsList = senderVerticals
        .map(sv => sv.vertical)
        .filter((v): v is Vertical => v !== null)

      setSelectedVerticals(verticalsList)

      // Set form values
      Object.entries(selected).forEach(([key, value]) => {
        if (key !== 'id') {
          setFormValue(key as keyof FormValues, value)
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

      if (updateError) throw updateError

      // Update sender_vertical relationships
      const { error: deleteError } = await supabase
        .from('sender_vertical')
        .delete()
        .eq('sender_id', selectedSender.id)

      if (deleteError) throw deleteError

      const verticalInserts = selectedVerticals.map(v => ({
        sender_id: selectedSender.id,
        vertical_id: v.id
      }))

      const { error: insertError } = await supabase
        .from('sender_vertical')
        .insert(verticalInserts)

      if (insertError) throw insertError

      toast.success('Sender updated successfully')
    } catch (error) {
      console.error('Error updating sender:', error)
      toast.error('Failed to update sender')
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
                    <label className="text-sm font-medium">Company *</label>
                    <Input
                      placeholder="Select company"
                      {...register("company", { required: "Company is required" })}
                    />
                    {errors.company && (
                      <p className="text-sm text-red-500">{errors.company.message}</p>
                    )}
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
                  <Button
                    type="button"
                    variant={tollFree ? "secondary" : "outline"}
                    onClick={() => {
                      if (tollFree) {
                        navigate(`/dashboard/maintenance/toll-free/${tollFree.id}`)
                      } else if (selectedSender) {
                        navigate(`/dashboard/maintenance/toll-free/new?sender_id=${selectedSender.id}`)
                      }
                    }}
                  >
                    {tollFree ? tollFree.did : "Add Toll-Free"}
                  </Button>
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