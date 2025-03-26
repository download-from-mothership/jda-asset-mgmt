-- Create the function to update toll-free messages
CREATE OR REPLACE FUNCTION public.update_toll_free_messages(toll_free_id bigint)
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
    FROM public.toll_free tf
    JOIN public.sender s ON tf.sender_id = s.id
    WHERE tf.id = toll_free_id;

    -- Get templates
    SELECT template INTO STRICT v_welcome_template
    FROM public.canned_messages WHERE msg_type = 'welcome';

    SELECT template INTO STRICT v_help_template
    FROM public.canned_messages WHERE msg_type = 'help';

    SELECT template INTO STRICT v_unsubscribe_template
    FROM public.canned_messages WHERE msg_type = 'unsubscribe';

    SELECT template INTO STRICT v_optin_template
    FROM public.canned_messages WHERE msg_type = 'optin_msg';

    -- First ensure toll_free_samples record exists
    INSERT INTO public.toll_free_samples (id)
    VALUES (toll_free_id)
    ON CONFLICT (id) DO NOTHING;

    -- Now update the messages
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
    WHERE tfs.id = toll_free_id;

    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed to update messages - no matching toll_free_samples record found';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_toll_free_messages(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_toll_free_messages(bigint) TO service_role;

-- Enable RPC access
COMMENT ON FUNCTION public.update_toll_free_messages(bigint) IS '@rpc ON'; 