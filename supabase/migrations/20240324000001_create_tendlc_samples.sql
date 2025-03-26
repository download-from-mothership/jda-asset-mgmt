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
  COALESCE(
    replace(
      replace(
        sm.sample1,
        '[brand]'::text,
        COALESCE(s.brand, ''::character varying)::text
      ),
      '[shorturl]'::text,
      COALESCE(s.shorturl, ''::character varying)::text
    ),
    tfs.sample_copy1,
    tfs.welcome_msg
  ) as sample1,
  COALESCE(
    replace(
      replace(
        sm.sample2,
        '[brand]'::text,
        COALESCE(s.brand, ''::character varying)::text
      ),
      '[shorturl]'::text,
      COALESCE(s.shorturl, ''::character varying)::text
    ),
    tfs.sample_copy2,
    tfs.help_msg
  ) as sample2,
  COALESCE(
    replace(
      replace(
        sm.sample3,
        '[brand]'::text,
        COALESCE(s.brand, ''::character varying)::text
      ),
      '[shorturl]'::text,
      COALESCE(s.shorturl, ''::character varying)::text
    ),
    tfs.sample_copy3,
    tfs.unsubscribe_msg
  ) as sample3
FROM tendlc tf
LEFT JOIN sender s ON tf.sender_id = s.id
LEFT JOIN sender_vertical sv ON s.id = sv.sender_id
LEFT JOIN sample_msgs sm ON sv.vertical_id = sm.vertical_id
LEFT JOIN tendlc_samples tfs ON tf.id = tfs.id;

-- Add comments
COMMENT ON TABLE public.tendlc_samples IS 'Stores message samples and templates for 10DLC numbers';
COMMENT ON VIEW public.tendlc_sms_samples IS 'View that combines 10DLC records with their associated sample messages, including both template-based and custom samples';

-- Grant permissions
GRANT ALL ON public.tendlc_samples TO authenticated;
GRANT ALL ON public.tendlc_samples TO service_role;
GRANT ALL ON public.tendlc_sms_samples TO authenticated;
GRANT ALL ON public.tendlc_sms_samples TO service_role;

-- Create trigger function to update canned messages
CREATE OR REPLACE FUNCTION public.update_tendlc_messages()
RETURNS trigger AS $$
BEGIN
    UPDATE tendlc_samples
    SET
        welcome_msg = (
            SELECT REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                cm.template,
                                '{brand}', COALESCE(s.brand, '')
                            ),
                            '{business_name}', COALESCE(s.business_name, '')
                        ),
                        '{sender}', COALESCE(s.sender, '')
                    ),
                    '{phone}', COALESCE(s.phone, '')
                ),
                '{terms}', COALESCE(s.terms, '')
            )
            FROM canned_messages cm
            JOIN tendlc tf ON tf.id = NEW.id
            JOIN sender s ON s.id = tf.sender_id
            WHERE cm.msg_type = 'welcome'
        ),
        help_msg = (
            SELECT REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                cm.template,
                                '{brand}', COALESCE(s.brand, '')
                            ),
                            '{business_name}', COALESCE(s.business_name, '')
                        ),
                        '{sender}', COALESCE(s.sender, '')
                    ),
                    '{phone}', COALESCE(s.phone, '')
                ),
                '{terms}', COALESCE(s.terms, '')
            )
            FROM canned_messages cm
            JOIN tendlc tf ON tf.id = NEW.id
            JOIN sender s ON s.id = tf.sender_id
            WHERE cm.msg_type = 'help'
        ),
        unsubscribe_msg = (
            SELECT REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                cm.template,
                                '{brand}', COALESCE(s.brand, '')
                            ),
                            '{business_name}', COALESCE(s.business_name, '')
                        ),
                        '{sender}', COALESCE(s.sender, '')
                    ),
                    '{phone}', COALESCE(s.phone, '')
                ),
                '{terms}', COALESCE(s.terms, '')
            )
            FROM canned_messages cm
            JOIN tendlc tf ON tf.id = NEW.id
            JOIN sender s ON s.id = tf.sender_id
            WHERE cm.msg_type = 'unsubscribe'
        ),
        optin_msg = (
            SELECT REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                cm.template,
                                '{brand}', COALESCE(s.brand, '')
                            ),
                            '{business_name}', COALESCE(s.business_name, '')
                        ),
                        '{sender}', COALESCE(s.sender, '')
                    ),
                    '{phone}', COALESCE(s.phone, '')
                ),
                '{terms}', COALESCE(s.terms, '')
            )
            FROM canned_messages cm
            JOIN tendlc tf ON tf.id = NEW.id
            JOIN sender s ON s.id = tf.sender_id
            WHERE cm.msg_type = 'optin_msg'
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