-- Update toll_free_samples table with processed message templates
UPDATE toll_free_samples tfs
SET 
    welcome_msg = (
        SELECT regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            cm.template, 
                            '{brand}', 
                            s.brand, 
                            'g'
                        ),
                        '{business_name}', 
                        s.business_name, 
                        'g'
                    ),
                    '{sender}',
                    s.sender,
                    'g'
                ),
                '{phone}', 
                s.phone, 
                'g'
            ),
            '{terms}', 
            s.terms, 
            'g'
        )
        FROM canned_messages cm
        JOIN toll_free tf ON tf.id = tfs.id
        JOIN sender s ON s.id = tf.sender_id
        WHERE cm.id = 1
    ),
    help_msg = (
        SELECT regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            cm.template, 
                            '{brand}', 
                            s.brand, 
                            'g'
                        ),
                        '{business_name}', 
                        s.business_name, 
                        'g'
                    ),
                    '{sender}',
                    s.sender,
                    'g'
                ),
                '{phone}', 
                s.phone, 
                'g'
            ),
            '{terms}', 
            s.terms, 
            'g'
        )
        FROM canned_messages cm
        JOIN toll_free tf ON tf.id = tfs.id
        JOIN sender s ON s.id = tf.sender_id
        WHERE cm.id = 2
    ),
    unsubscribe_msg = (
        SELECT regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            cm.template, 
                            '{brand}', 
                            s.brand, 
                            'g'
                        ),
                        '{business_name}', 
                        s.business_name, 
                        'g'
                    ),
                    '{sender}',
                    s.sender,
                    'g'
                ),
                '{phone}', 
                s.phone, 
                'g'
            ),
            '{terms}', 
            s.terms, 
            'g'
        )
        FROM canned_messages cm
        JOIN toll_free tf ON tf.id = tfs.id
        JOIN sender s ON s.id = tf.sender_id
        WHERE cm.id = 3
    )
WHERE EXISTS (
    SELECT 1 FROM canned_messages cm 
    WHERE cm.id IN (1, 2, 3)
); 