import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import React from "react"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const senderFormSchema = z.object({
  sender: z.string().min(2, {
    message: "Sender name must be at least 2 characters.",
  }),
  shorturl: z.string().optional(),
  brand: z.string().optional(),
  vertical: z.array(z.string()).min(1, {
    message: "At least one vertical is required.",
  }),
  company: z.string().optional(),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  city: z.string().min(2, {
    message: "City must be at least 2 characters.",
  }),
  state: z.string().length(2, {
    message: "Please enter a valid state abbreviation.",
  }),
  zip: z.string().min(5, {
    message: "Please enter a valid ZIP code.",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  cta: z.string().optional(),
  terms: z.string().optional(),
  privacypolicy: z.string().optional(),
})

type SenderFormValues = z.infer<typeof senderFormSchema>

const defaultValues: Partial<SenderFormValues> = {
  sender: "",
  shorturl: "",
  brand: "",
  vertical: [],
  company: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  cta: "",
  terms: "",
  privacypolicy: "",
}

interface Vertical {
  id: number
  vertical_name: string
}

interface Company {
  company_name: string;
}

export function AddSenderForm() {
  const [verticals, setVerticals] = React.useState<Vertical[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companySearch, setCompanySearch] = useState("")
  const [verticalSearch, setVerticalSearch] = useState("")
  const navigate = useNavigate()

  const form = useForm<SenderFormValues>({
    resolver: zodResolver(senderFormSchema),
    defaultValues,
  })

  useEffect(() => {
    const fetchVerticals = async () => {
      const { data, error } = await supabase
        .from('vertical')
        .select('id, vertical_name')

      if (error) {
        console.error('Error fetching verticals:', error)
        return
      }

      setVerticals(data.map(item => ({
        id: Number(item.id),
        vertical_name: String(item.vertical_name)
      })))
    }

    fetchVerticals()
  }, [])

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await supabase
          .from('company')
          .select('company_name')

        if (Array.isArray(response)) {
          const typedResponse = response as unknown as Company[];
          setCompanies(typedResponse);
        } else {
          console.error('Unexpected response format:', response);
          setCompanies([]);
        }
      } catch (error) {
        console.error('Error loading companies:', error);
        setCompanies([]);
      }
    };

    loadCompanies();
  }, []);

  const filteredCompanies = companySearch
    ? companies.filter((company) =>
        company.company_name.toLowerCase().includes(companySearch.toLowerCase())
      )
    : companies;

  const filteredVerticals = verticalSearch
    ? verticals.filter((vertical) =>
        vertical.vertical_name.toLowerCase().includes(verticalSearch.toLowerCase())
      )
    : verticals;

  async function onSubmit(data: SenderFormValues) {
    try {
      // First, insert the sender record with only the fields that exist in the sender table
      const { data: senderData, error: senderError } = await supabase
        .from('sender')
        .insert({
          sender: data.sender,
          shorturl: data.shorturl || null,
          brand: data.brand || null,
          company: data.company || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          cta: data.cta || null,
          terms: data.terms || null,
          privacypolicy: data.privacypolicy || null,
          lastmodified: new Date().toISOString(),
          modified_by: (await supabase.auth.getSession()).data.session?.user?.id || null,
          modified_by_name: (await supabase.auth.getSession()).data.session?.user?.email || null
        })
        .select()
        .single()

      if (senderError) {
        console.error('Error creating sender:', senderError)
        throw new Error(`Failed to create sender: ${senderError.message}`)
      }

      if (!senderData) {
        throw new Error('No data returned from sender insert')
      }

      // Then, insert the vertical relationships
      if (data.vertical && data.vertical.length > 0) {
        const verticalInserts = data.vertical.map(verticalName => {
          const vertical = verticals.find(v => v.vertical_name === verticalName)
          if (!vertical) {
            console.error(`Vertical not found: ${verticalName}`)
            return null
          }
          return {
            sender_id: senderData.id,
            vertical_id: vertical.id
          }
        }).filter((v): v is { sender_id: number; vertical_id: number } => v !== null)

        if (verticalInserts.length > 0) {
          const { error: verticalError } = await supabase
            .from('sender_vertical')
            .insert(verticalInserts)

          if (verticalError) {
            console.error('Error creating vertical relationships:', verticalError)
            throw new Error(`Failed to create vertical relationships: ${verticalError.message}`)
          }
        }
      }

      toast.success('Sender created successfully')
      navigate(`/dashboard/maintenance/update?id=${senderData.id}`)
    } catch (error) {
      console.error('Error in onSubmit:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create sender')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="sender"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Sender Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter sender name" {...field} className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="shorturl"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Short URL</FormLabel>
                <FormControl>
                  <Input placeholder="Enter short URL" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Enter brand" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="vertical"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Verticals *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "h-8 w-full justify-between",
                          !field.value?.length && "text-muted-foreground"
                        )}
                      >
                        {field.value?.length > 0
                          ? `${field.value.length} vertical${field.value.length > 1 ? 's' : ''} selected`
                          : "Select verticals"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="flex flex-col">
                      <div className="p-2 pb-0">
                        <Input
                          placeholder="Search verticals..."
                          className="h-8"
                          value={verticalSearch}
                          onChange={(e) => setVerticalSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredVerticals.map((vertical) => (
                          <div
                            key={vertical.vertical_name}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            onClick={() => {
                              const currentValues = field.value || [];
                              const newValues = currentValues.includes(vertical.vertical_name)
                                ? currentValues.filter((v) => v !== vertical.vertical_name)
                                : [...currentValues, vertical.vertical_name];
                              field.onChange(newValues);
                              setVerticalSearch("");
                            }}
                          >
                            <div className="mr-2 flex h-4 w-4 items-center justify-center rounded border">
                              {field.value?.includes(vertical.vertical_name) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            {vertical.vertical_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {field.value?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {field.value.map((value) => (
                      <div
                        key={value}
                        className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(field.value?.filter((v) => v !== value));
                          }}
                          className="text-primary hover:text-primary/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Company *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "h-8 w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value || "Select company"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="flex flex-col">
                      <div className="p-2 pb-0">
                        <Input
                          placeholder="Search company..."
                          className="h-8"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredCompanies.map((company) => (
                          <div
                            key={company.company_name}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            onClick={() => {
                              field.onChange(company.company_name);
                              setCompanySearch("");
                            }}
                          >
                            <div className="mr-2 flex h-4 w-4 items-center justify-center rounded border">
                              {field.value === company.company_name && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            {company.company_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter address" {...field} className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Enter city" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" maxLength={2} {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Zip</FormLabel>
                <FormControl>
                  <Input placeholder="ZIP code" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number" {...field} className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cta"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>CTA</FormLabel>
              <FormControl>
                <Input placeholder="Enter CTA" {...field} className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>T&C</FormLabel>
                <FormControl>
                  <Input placeholder="Enter terms and conditions" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privacypolicy"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Privacy Policy</FormLabel>
                <FormControl>
                  <Input placeholder="Enter privacy policy" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()} className="h-8">
            Clear form
          </Button>
          <Button type="submit" className="h-8">Create</Button>
        </div>
      </form>
    </Form>
  )
} 