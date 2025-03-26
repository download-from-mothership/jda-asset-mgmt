-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_toll_free_messages()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_data record;
    v_welcome_template text;
    v_help_template text;
    v_unsubscribe_template text;
    v_optin_template text;
BEGIN
    -- Get sender data first
    SELECT s.* INTO STRICT v_sender_data
    FROM public.toll_free tf
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
    UPDATE public.toll_free_samples tfs
    SET 
        welcome_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        v_welcome_template,
                        '{brand}', COALESCE(v_sender_data.brand, '')
                    ),
                    '{business_name}', COALESCE(v_sender_data.business_name, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{terms}', COALESCE(v_sender_data.terms, '')
        ),
        help_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        v_help_template,
                        '{brand}', COALESCE(v_sender_data.brand, '')
                    ),
                    '{business_name}', COALESCE(v_sender_data.business_name, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{sender}', COALESCE(v_sender_data.sender, '')
        ),
        unsubscribe_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        v_unsubscribe_template,
                        '{brand}', COALESCE(v_sender_data.brand, '')
                    ),
                    '{business_name}', COALESCE(v_sender_data.business_name, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{sender}', COALESCE(v_sender_data.sender, '')
        ),
        optin_msg = REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        v_optin_template,
                        '{brand}', COALESCE(v_sender_data.brand, '')
                    ),
                    '{business_name}', COALESCE(v_sender_data.business_name, '')
                ),
                '{phone}', COALESCE(v_sender_data.phone, '')
            ),
            '{sender}', COALESCE(v_sender_data.sender, '')
        )
    WHERE tfs.id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_toll_free_messages_trigger ON toll_free_samples;

-- Create the trigger
CREATE TRIGGER update_toll_free_messages_trigger
    AFTER INSERT OR UPDATE ON toll_free_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_toll_free_messages();

-- Add comment to explain the trigger's purpose
COMMENT ON FUNCTION update_toll_free_messages() IS 'Automatically updates welcome_msg, help_msg, unsubscribe_msg, and optin_msg fields in toll_free_samples table using templates from canned_messages'; 