-- Create tendlc_samples table
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

-- Create tendlc_sms_samples view for initial samples
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
COMMENT ON TABLE public.tendlc_samples IS 'Stores message samples and templates for 10DLC numbers';
COMMENT ON VIEW public.tendlc_sms_samples IS 'View that joins initial sample messages with 10DLC records';

-- Grant permissions
GRANT ALL ON public.tendlc_samples TO authenticated;
GRANT ALL ON public.tendlc_samples TO service_role;
GRANT ALL ON public.tendlc_sms_samples TO authenticated;
GRANT ALL ON public.tendlc_sms_samples TO service_role;

-- Create trigger function to update canned messages
CREATE OR REPLACE FUNCTION public.update_tendlc_messages()
RETURNS trigger AS $$
DECLARE
    v_sender_data record;
    v_welcome_template text;
    v_help_template text;
    v_unsubscribe_template text;
    v_optin_template text;
BEGIN
    -- Skip if this is a recursive update from the trigger itself
    IF TG_OP = 'UPDATE' AND NEW.welcome_msg IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get sender data first
    SELECT s.* INTO STRICT v_sender_data
    FROM public.tendlc tf
    JOIN public.sender s ON s.id = tf.sender_id
    WHERE tf.id = NEW.id;

    -- Get templates
    SELECT template INTO STRICT v_welcome_template
    FROM public.canned_messages WHERE msg_type = 'welcome';

    SELECT template INTO STRICT v_help_template
    FROM public.canned_messages WHERE msg_type = 'help';

    SELECT template INTO STRICT v_unsubscribe_template
    FROM public.canned_messages WHERE msg_type = 'unsubscribe';

    SELECT template INTO STRICT v_optin_template
    FROM public.canned_messages WHERE msg_type = 'optin_msg';

    -- Update the messages
    UPDATE tendlc_samples
    SET
        welcome_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            v_welcome_template,
                            '{brand}', COALESCE(v_sender_data.brand, '')
                        ),
                        '{business_name}', COALESCE(v_sender_data.business_name, '')
                    ),
                    '{sender}', COALESCE(v_sender_data.sender, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{terms}', COALESCE(v_sender_data.terms, '')
        ),
        help_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            v_help_template,
                            '{brand}', COALESCE(v_sender_data.brand, '')
                        ),
                        '{business_name}', COALESCE(v_sender_data.business_name, '')
                    ),
                    '{sender}', COALESCE(v_sender_data.sender, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{terms}', COALESCE(v_sender_data.terms, '')
        ),
        unsubscribe_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            v_unsubscribe_template,
                            '{brand}', COALESCE(v_sender_data.brand, '')
                        ),
                        '{business_name}', COALESCE(v_sender_data.business_name, '')
                    ),
                    '{sender}', COALESCE(v_sender_data.sender, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{terms}', COALESCE(v_sender_data.terms, '')
        ),
        optin_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            v_optin_template,
                            '{brand}', COALESCE(v_sender_data.brand, '')
                        ),
                        '{business_name}', COALESCE(v_sender_data.business_name, '')
                    ),
                    '{sender}', COALESCE(v_sender_data.sender, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{terms}', COALESCE(v_sender_data.terms, '')
        )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_tendlc_messages_trigger ON tendlc_samples;

CREATE TRIGGER update_tendlc_messages_trigger
    AFTER INSERT OR UPDATE ON tendlc_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_tendlc_messages();

-- Add comment to explain the trigger's purpose
COMMENT ON FUNCTION update_tendlc_messages() IS 'Automatically updates welcome_msg, help_msg, unsubscribe_msg, and optin_msg fields in tendlc_samples table using templates from canned_messages'; 