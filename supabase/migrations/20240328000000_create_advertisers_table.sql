-- Create advertisers table
CREATE TABLE public.advertisers (
  id bigserial NOT NULL,
  name character varying(255) NOT NULL,
  total_campaigns integer NOT NULL DEFAULT 0,
  active_campaigns integer NOT NULL DEFAULT 0,
  total_spend decimal(10,2) NOT NULL DEFAULT 0,
  last_campaign_date date,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT advertisers_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add comments
COMMENT ON TABLE public.advertisers IS 'Stores advertiser information and campaign performance metrics';

-- Grant permissions
GRANT ALL ON public.advertisers TO authenticated;
GRANT ALL ON public.advertisers TO service_role;

-- Create index on name for faster lookups
CREATE INDEX advertisers_name_idx ON public.advertisers USING btree (name); 