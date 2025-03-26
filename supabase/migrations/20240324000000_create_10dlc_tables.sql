-- Create 10dlc table
CREATE TABLE public.tendlc (
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
  lastmodified timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid NULL,
  modified_by_name character varying(255) NULL,
  sender_id integer NULL,
  CONSTRAINT tendlc_pkey PRIMARY KEY (id),
  CONSTRAINT tendlc_sender_unique UNIQUE (sender),
  CONSTRAINT fk_tendlc_provider FOREIGN KEY (provider_id) REFERENCES provider (providerid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_sender FOREIGN KEY (sender) REFERENCES sender (sender) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_brief FOREIGN KEY (brief) REFERENCES brief (briefid) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_sender_status FOREIGN KEY (status_id) REFERENCES sender_status (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tendlc_sender_id FOREIGN KEY (sender_id) REFERENCES sender (id),
  CONSTRAINT fk_tendlc_modified_by FOREIGN KEY (modified_by) REFERENCES profiles (id) ON UPDATE CASCADE ON DELETE RESTRICT
) TABLESPACE pg_default;

-- Create unique index for DID
CREATE UNIQUE INDEX IF NOT EXISTS tendlc_did_unique ON public.tendlc USING btree (did) TABLESPACE pg_default
WHERE ((did)::text <> '(000) 000-0000'::text);

-- Create 10dlc samples table
CREATE TABLE public.tendlc_samples (
  id bigint NOT NULL,
  sample_copy1 text NULL,
  sample_copy2 text NULL,
  sample_copy3 text NULL,
  welcome_msg text NULL,
  help_msg text NULL,
  unsubscribe_msg text NULL,
  optin_msg text NULL,
  CONSTRAINT tendlc_samples_pkey PRIMARY KEY (id),
  CONSTRAINT tendlc_samples_id_fkey FOREIGN KEY (id) REFERENCES tendlc (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create view for initial samples
CREATE OR REPLACE VIEW public.tendlc_sms_samples AS
SELECT 
  tf.id,
  sm.sample1,
  sm.sample2,
  sm.sample3
FROM tendlc tf
LEFT JOIN sender s ON tf.sender_id = s.id
LEFT JOIN sender_vertical sv ON s.id = sv.sender_id
LEFT JOIN sample_msgs sm ON sv.vertical_id = sm.vertical_id;

-- Add comments
COMMENT ON TABLE public.tendlc IS 'Stores 10DLC number information and their associated metadata';
COMMENT ON TABLE public.tendlc_samples IS 'Stores message samples and templates for 10DLC numbers';
COMMENT ON VIEW public.tendlc_sms_samples IS 'View that joins initial sample messages with 10DLC records';

-- Grant permissions
GRANT ALL ON public.tendlc TO authenticated;
GRANT ALL ON public.tendlc TO service_role;
GRANT ALL ON public.tendlc_samples TO authenticated;
GRANT ALL ON public.tendlc_samples TO service_role;
GRANT ALL ON public.tendlc_sms_samples TO authenticated;
GRANT ALL ON public.tendlc_sms_samples TO service_role; 