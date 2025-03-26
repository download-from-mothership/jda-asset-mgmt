-- Create the RPC function to update tendlc messages
CREATE OR REPLACE FUNCTION public.update_tendlc_messages(tendlc_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_sender_data record;
    v_welcome_template text;
    v_help_template text;
    v_unsubscribe_template text;
    v_optin_template text;
BEGIN
    -- Get sender data first
    SELECT s.* INTO STRICT v_sender_data
    FROM public.tendlc tf
    JOIN public.sender s ON tf.sender_id = s.id
    WHERE tf.id = tendlc_id;

    -- Get templates
    SELECT template INTO STRICT v_welcome_template
    FROM public.canned_messages WHERE msg_type = 'welcome';

    SELECT template INTO STRICT v_help_template
    FROM public.canned_messages WHERE msg_type = 'help';

    SELECT template INTO STRICT v_unsubscribe_template
    FROM public.canned_messages WHERE msg_type = 'unsubscribe';

    SELECT template INTO STRICT v_optin_template
    FROM public.canned_messages WHERE msg_type = 'optin_msg';

    -- First ensure tendlc_samples record exists
    INSERT INTO public.tendlc_samples (id)
    VALUES (tendlc_id)
    ON CONFLICT (id) DO NOTHING;

    -- Now update the messages
    UPDATE public.tendlc_samples tfs
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
    WHERE tfs.id = tendlc_id;

    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update messages - no matching tendlc_samples record found';
    END IF;
END;
$$;

-- Create the trigger function for automatic updates
CREATE OR REPLACE FUNCTION public.update_tendlc_messages_trigger()
RETURNS trigger AS $$
BEGIN
    -- Skip if this is a recursive update from the trigger itself
    IF TG_OP = 'UPDATE' AND NEW.welcome_msg IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Call the main function
    PERFORM public.update_tendlc_messages(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger
DROP TRIGGER IF EXISTS update_tendlc_messages_trigger ON tendlc_samples;

-- Create new trigger with new function
CREATE TRIGGER update_tendlc_messages_trigger
    AFTER INSERT OR UPDATE ON tendlc_samples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tendlc_messages_trigger();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_tendlc_messages(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tendlc_messages(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_tendlc_messages_trigger() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tendlc_messages_trigger() TO service_role;

-- Enable RPC access
COMMENT ON FUNCTION public.update_tendlc_messages(bigint) IS '@rpc ON';

-- Add helpful comments
COMMENT ON FUNCTION public.update_tendlc_messages(bigint) IS 'Updates welcome_msg, help_msg, unsubscribe_msg, and optin_msg fields in tendlc_samples table using templates from canned_messages';
COMMENT ON FUNCTION public.update_tendlc_messages_trigger() IS 'Trigger function that calls update_tendlc_messages when tendlc_samples records are inserted or updated'; 