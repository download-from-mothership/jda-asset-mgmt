-- Drop existing table if it exists
DROP TABLE IF EXISTS public.tendlc CASCADE;

-- Create updated tendlc table
CREATE TABLE public.tendlc (
  id bigserial NOT NULL,
  sender character varying(255) NOT NULL,
  did character varying(20) NULL,
  business_name character varying(255) GENERATED ALWAYS AS (
    regexp_replace((sender)::text, '\..*$'::text, ''::text)
  ) STORED,
  status_id bigint NOT NULL,
  provider_id bigint NULL,
  campaignid_tcr character varying(255) NULL,
  use_case character varying(255) NULL,
  brief bigint NULL,
  submitteddate date NULL,
  notes character varying(255) NULL,
  lastmodified timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid NULL,
  modified_by_name character varying(255) NULL,
  sender_id integer NULL,
  CONSTRAINT tendlc_pkey PRIMARY KEY (id),
  CONSTRAINT tendlc_sender_unique UNIQUE (sender),
  CONSTRAINT fk_tendlc_provider FOREIGN KEY (provider_id) REFERENCES provider (providerid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_brief FOREIGN KEY (brief) REFERENCES brief (briefid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_sender_status FOREIGN KEY (status_id) REFERENCES sender_status (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_sender_id FOREIGN KEY (sender_id) REFERENCES sender (id),
  CONSTRAINT fk_tendlc_modified_by FOREIGN KEY (modified_by) REFERENCES profiles (id) ON UPDATE CASCADE ON DELETE RESTRICT
) TABLESPACE pg_default;

-- Create unique index for DID
CREATE UNIQUE INDEX IF NOT EXISTS tendlc_did_unique ON public.tendlc USING btree (did) TABLESPACE pg_default
WHERE ((did)::text <> '(000) 000-0000'::text);

-- Add comments
COMMENT ON TABLE public.tendlc IS 'Stores 10DLC number information and their associated metadata';
COMMENT ON COLUMN public.tendlc.id IS 'Primary key';
COMMENT ON COLUMN public.tendlc.sender IS 'The sender identifier';
COMMENT ON COLUMN public.tendlc.did IS 'The 10DLC number in (XXX) XXX-XXXX format';
COMMENT ON COLUMN public.tendlc.business_name IS 'Generated business name from sender';
COMMENT ON COLUMN public.tendlc.status_id IS 'Reference to sender_status table';
COMMENT ON COLUMN public.tendlc.provider_id IS 'Reference to provider table';
COMMENT ON COLUMN public.tendlc.campaignid_tcr IS 'Campaign ID from TCR';
COMMENT ON COLUMN public.tendlc.use_case IS 'Use case description';
COMMENT ON COLUMN public.tendlc.brief IS 'Reference to brief table';
COMMENT ON COLUMN public.tendlc.submitteddate IS 'Date when submitted';
COMMENT ON COLUMN public.tendlc.notes IS 'Additional notes';
COMMENT ON COLUMN public.tendlc.lastmodified IS 'Last modification timestamp';
COMMENT ON COLUMN public.tendlc.modified_by IS 'UUID of user who last modified the record';
COMMENT ON COLUMN public.tendlc.modified_by_name IS 'Name of user who last modified the record';
COMMENT ON COLUMN public.tendlc.sender_id IS 'Reference to sender table ID';

-- Grant permissions
GRANT ALL ON public.tendlc TO authenticated;
GRANT ALL ON public.tendlc TO service_role; 