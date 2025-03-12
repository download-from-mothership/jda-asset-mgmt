-- Create the function to update toll-free messages
CREATE OR REPLACE FUNCTION public.update_toll_free_messages(toll_free_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.toll_free_samples tfs
    SET 
        welcome_msg = COALESCE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            (SELECT template FROM public.canned_messages WHERE msg_type = 'welcome'),
                            '{brand}', COALESCE(s.brand, '')
                        ),
                        '{business_name}', COALESCE(s.business_name, '')
                    ),
                    '{terms}', COALESCE(s.terms, '')
                ),
                '{phone}', COALESCE(s.phone, '')
            ),
            tfs.welcome_msg
        ),
        help_msg = COALESCE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        (SELECT template FROM public.canned_messages WHERE msg_type = 'help'),
                        '{brand}', COALESCE(s.brand, '')
                    ),
                    '{sender}', COALESCE(s.sender, '')
                ),
                '{phone}', COALESCE(s.phone, '')
            ),
            tfs.help_msg
        ),
        unsubscribe_msg = COALESCE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        (SELECT template FROM public.canned_messages WHERE msg_type = 'unsubscribe'),
                        '{brand}', COALESCE(s.brand, '')
                    ),
                    '{sender}', COALESCE(s.sender, '')
                ),
                '{phone}', COALESCE(s.phone, '')
            ),
            tfs.unsubscribe_msg
        ),
        optin_msg = COALESCE(
            REPLACE(
                REPLACE(
                    (SELECT template FROM public.canned_messages WHERE msg_type = 'optin_msg'),
                    '{brand}', COALESCE(s.brand, '')
                ),
                '{sender}', COALESCE(s.sender, '')
            ),
            tfs.optin_msg
        )
    FROM public.toll_free tf
    JOIN public.sender s ON tf.sender_id = s.id
    WHERE 
        tfs.id = tf.id
        AND tf.id = toll_free_id;
END;
$$; 