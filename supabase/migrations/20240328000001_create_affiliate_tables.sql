-- Create clients table
CREATE TABLE public.clients (
  id bigserial NOT NULL,
  client_id character varying(255) NOT NULL,
  name character varying(255) NOT NULL,
  api_key character varying(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_client_id_unique UNIQUE (client_id)
) TABLESPACE pg_default;

-- Create affiliate_reports table
CREATE TABLE public.affiliate_reports (
  id bigserial NOT NULL,
  client_id character varying(255) NOT NULL,
  date date NOT NULL,
  offer character varying(255) NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT affiliate_reports_pkey PRIMARY KEY (id),
  CONSTRAINT affiliate_reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE,
  CONSTRAINT affiliate_reports_unique_constraint UNIQUE (client_id, date, offer)
) TABLESPACE pg_default;

-- Add comments
COMMENT ON TABLE public.clients IS 'Stores client information and API keys for affiliate reporting';
COMMENT ON TABLE public.affiliate_reports IS 'Stores daily affiliate performance data';

-- Grant permissions
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.affiliate_reports TO authenticated;
GRANT ALL ON public.affiliate_reports TO service_role;

-- Create indexes for better query performance
CREATE INDEX affiliate_reports_client_id_idx ON public.affiliate_reports(client_id);
CREATE INDEX affiliate_reports_date_idx ON public.affiliate_reports(date);
CREATE INDEX affiliate_reports_offer_idx ON public.affiliate_reports(offer); 