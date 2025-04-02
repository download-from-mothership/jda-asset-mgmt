-- Add affiliate_id column to advertisers table
ALTER TABLE public.advertisers
ADD COLUMN affiliate_id integer;

-- Add foreign key constraint
ALTER TABLE public.advertisers
ADD CONSTRAINT fk_advertisers_affiliate
FOREIGN KEY (affiliate_id)
REFERENCES public.affiliates(affiliate_id);

-- Add comment
COMMENT ON COLUMN public.advertisers.affiliate_id IS 'Reference to the affiliate account number for this advertiser';

-- Create index for faster lookups
CREATE INDEX advertisers_affiliate_id_idx ON public.advertisers USING btree (affiliate_id); 