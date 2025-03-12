-- Update toll_free_samples with messages from canned_messages templates
UPDATE public.toll_free_samples tfs
SET 
    welcome_msg = REPLACE(
        REPLACE(
            REPLACE(
                REPLACE(
                    (SELECT template FROM public.canned_messages WHERE msg_type = 'welcome'),
                    '{brand}', s.brand
                ),
                '{business_name}', s.business_name
            ),
            '{terms}', s.terms
        ),
        '{phone}', s.phone
    ),
    help_msg = REPLACE(
        REPLACE(
            REPLACE(
                (SELECT template FROM public.canned_messages WHERE msg_type = 'help'),
                '{business_name}', s.business_name
            ),
            '{phone}', s.phone
        ),
        '{sender}', s.sender
    ),
    unsubscribe_msg = REPLACE(
        REPLACE(
            (SELECT template FROM public.canned_messages WHERE msg_type = 'unsubscribe'),
            '{business_name}', s.business_name
        ),
        '{phone}', s.phone
    )
FROM public.toll_free tf
JOIN public.sender s ON tf.sender_id = s.id
WHERE 
    tfs.id = tf.id
    AND (tfs.welcome_msg IS NULL 
    OR tfs.help_msg IS NULL 
    OR tfs.unsubscribe_msg IS NULL); 