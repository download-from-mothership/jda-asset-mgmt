-- Update toll_free table schema
-- This migration updates the toll_free table with new columns and constraints

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.toll_free CASCADE;

-- Create updated toll_free table
CREATE TABLE public.toll_free (
  id bigserial NOT NULL,
  sender character varying(255) NOT NULL,
  did character varying(20) NULL,
  business_name character varying GENERATED ALWAYS AS (
    regexp_replace((sender)::text, '\..*$'::text, ''::text)
  ) STORED (255) NULL,
  status_id bigint NOT NULL,
  provider_id bigint NULL,
  campaignid_tcr character varying(255) NULL,
  use_case character varying(255) NULL,
  use_case_helper character varying(255) NULL,
  brief bigint NULL,
  submitteddate date NULL,
  notes character varying(255) NULL,
  lastmodified timestamp with time zone NOT NULL,
  modified_by uuid NULL,
  modified_by_name character varying(255) NULL,
  sender_id integer NULL,
  CONSTRAINT toll_free_pkey PRIMARY KEY (id),
  CONSTRAINT toll_free_sender_unique UNIQUE (sender),
  CONSTRAINT fk_toll_free_provider FOREIGN KEY (provider_id) REFERENCES provider (providerid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_toll_free_sender FOREIGN KEY (sender) REFERENCES sender (sender) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_toll_free_brief FOREIGN KEY (brief) REFERENCES brief (briefid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_toll_free_sender_status FOREIGN KEY (status_id) REFERENCES sender_status (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_toll_free_sender_id FOREIGN KEY (sender_id) REFERENCES sender (id),
  CONSTRAINT fk_toll_free_modified_by FOREIGN KEY (modified_by) REFERENCES profiles (id) ON UPDATE CASCADE ON DELETE RESTRICT
) TABLESPACE pg_default;

-- Create unique index for DID
CREATE UNIQUE INDEX IF NOT EXISTS toll_free_did_unique ON public.toll_free USING btree (did) TABLESPACE pg_default
WHERE ((did)::text <> '(000) 000-0000'::text);

-- Add comments
COMMENT ON TABLE public.toll_free IS 'Stores toll-free number information and their associated metadata';
COMMENT ON COLUMN public.toll_free.id IS 'Primary key';
COMMENT ON COLUMN public.toll_free.sender IS 'The sender identifier';
COMMENT ON COLUMN public.toll_free.did IS 'The toll-free number in (XXX) XXX-XXXX format';
COMMENT ON COLUMN public.toll_free.business_name IS 'Generated business name from sender';
COMMENT ON COLUMN public.toll_free.status_id IS 'Reference to sender_status table';
COMMENT ON COLUMN public.toll_free.provider_id IS 'Reference to provider table';
COMMENT ON COLUMN public.toll_free.campaignid_tcr IS 'Campaign ID from TCR';
COMMENT ON COLUMN public.toll_free.use_case IS 'Use case description';
COMMENT ON COLUMN public.toll_free.use_case_helper IS 'Additional use case information';
COMMENT ON COLUMN public.toll_free.brief IS 'Reference to brief table';
COMMENT ON COLUMN public.toll_free.submitteddate IS 'Date when submitted';
COMMENT ON COLUMN public.toll_free.notes IS 'Additional notes';
COMMENT ON COLUMN public.toll_free.lastmodified IS 'Last modification timestamp';
COMMENT ON COLUMN public.toll_free.modified_by IS 'UUID of user who last modified the record';
COMMENT ON COLUMN public.toll_free.modified_by_name IS 'Name of user who last modified the record';
COMMENT ON COLUMN public.toll_free.sender_id IS 'Reference to sender table ID'; 