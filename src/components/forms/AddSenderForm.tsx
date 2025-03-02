import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { insertData } from "@/lib/supabase"

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

const senderFormSchema = z.object({
  sender: z.string().min(2, {
    message: "Sender name must be at least 2 characters.",
  }),
  shorturl: z.string().optional(),
  brand: z.string().optional(),
  vertical: z.string().min(1, {
    message: "Vertical is required.",
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
  vertical: "",
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

export function AddSenderForm() {
  const form = useForm<SenderFormValues>({
    resolver: zodResolver(senderFormSchema),
    defaultValues,
  })

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
                <FormLabel>Vertical *</FormLabel>
                <FormControl>
                  <Input placeholder="Select vertical" {...field} className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Add company" {...field} className="h-8" />
                </FormControl>
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