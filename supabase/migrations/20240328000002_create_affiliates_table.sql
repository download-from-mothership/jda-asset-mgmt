-- Create affiliates table
CREATE TABLE public.affiliates (
  id bigserial NOT NULL,
  name character varying(255) NOT NULL,
  api_endpoint character varying(255) NOT NULL,
  api_key character varying(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT affiliates_pkey PRIMARY KEY (id),
  CONSTRAINT affiliates_name_unique UNIQUE (name)
) TABLESPACE pg_default;

-- Add comments
COMMENT ON TABLE public.affiliates IS 'Stores affiliate information and their API endpoints';

-- Grant permissions
GRANT ALL ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;

-- Create index on name for faster lookups
CREATE INDEX affiliates_name_idx ON public.affiliates USING btree (name); 