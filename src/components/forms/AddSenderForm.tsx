import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { insertData, fetchData } from "@/lib/supabase"
import { useEffect, useState } from "react"

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
  company: z.string().min(1, {
    message: "Company is required.",
  }),
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
  vertical_name: string;
}

interface Company {
  company_name: string;
}

export function AddSenderForm() {
  const [verticals, setVerticals] = useState<Vertical[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companySearch, setCompanySearch] = useState("")

  const form = useForm<SenderFormValues>({
    resolver: zodResolver(senderFormSchema),
    defaultValues,
  })

  useEffect(() => {
    const loadVerticals = async () => {
      try {
        const response = await fetchData('vertical', 'vertical_name');
        if (Array.isArray(response)) {
          const typedResponse = response as unknown as Vertical[];
          setVerticals(typedResponse);
        } else {
          console.error('Unexpected response format:', response);
          setVerticals([]);
        }
      } catch (error) {
        console.error('Error loading verticals:', error);
        setVerticals([]);
      }
    };

    const loadCompanies = async () => {
      try {
        const response = await fetchData('company', 'company_name');
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

    loadVerticals();
    loadCompanies();
  }, []);

  const filteredCompanies = companySearch
    ? companies.filter((company) =>
        company.company_name.toLowerCase().includes(companySearch.toLowerCase())
      )
    : companies;

  async function onSubmit(data: SenderFormValues) {
    try {
      const result = await insertData('senders', data);
      console.log('Sender added successfully:', result);
      form.reset();
    } catch (error) {
      console.error('Error adding sender:', error);
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
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {verticals.map((vertical) => (
                        <div
                          key={vertical.vertical_name}
                          className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                          onClick={() => {
                            const currentValues = field.value || [];
                            const newValues = currentValues.includes(vertical.vertical_name)
                              ? currentValues.filter((v) => v !== vertical.vertical_name)
                              : [...currentValues, vertical.vertical_name];
                            field.onChange(newValues);
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