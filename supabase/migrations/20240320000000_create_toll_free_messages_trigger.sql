-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_toll_free_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- Update welcome_msg
    UPDATE toll_free_samples
    SET welcome_msg = (
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
        JOIN toll_free tf ON tf.id = NEW.id
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
        JOIN toll_free tf ON tf.id = NEW.id
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
        JOIN toll_free tf ON tf.id = NEW.id
        JOIN sender s ON s.id = tf.sender_id
        WHERE cm.id = 3
    )
    WHERE id = NEW.id;

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
COMMENT ON FUNCTION update_toll_free_messages() IS 'Automatically updates welcome_msg, help_msg, and unsubscribe_msg fields in toll_free_samples table using templates from canned_messages'; 