-- Create or replace the toll_free_sms_samples view
CREATE OR REPLACE VIEW public.toll_free_sms_samples AS
SELECT 
    tf.id,
    tf.sender,
    tf.did,
    tf.business_name,
    tf.status_id,
    tf.provider_id,
    tf.campaignid_tcr,
    tf.use_case,
    tf.use_case_helper,
    tf.brief,
    tf.submitteddate,
    tf.notes,
    tf.lastmodified,
    tf.modified_by,
    tf.modified_by_name,
    -- First try to get samples from sample_msgs based on vertical_id
    -- If not available, fall back to toll_free_samples
    -- Finally fall back to welcome_msg, help_msg, and unsubscribe_msg
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
    ) as sample3,
    -- Add diagnostic columns at the end
    s.id as debug_sender_id,
    s.sender as debug_sender_text,
    s.brand as debug_sender_brand,
    s.business_name as debug_sender_business_name,
    sv.vertical_id as debug_vertical_id,
    sm.vertical_id as debug_sample_msg_vertical_id,
    sm.sample1 as debug_raw_sample1,
    sm.sample2 as debug_raw_sample2,
    sm.sample3 as debug_raw_sample3,
    tfs.sample_copy1 as debug_tfs_sample1,
    tfs.sample_copy2 as debug_tfs_sample2,
    tfs.sample_copy3 as debug_tfs_sample3,
    tfs.welcome_msg as debug_welcome_msg,
    tfs.help_msg as debug_help_msg,
    tfs.unsubscribe_msg as debug_unsubscribe_msg,
    CASE 
        WHEN sm.sample1 IS NOT NULL THEN 'sample_msgs'
        WHEN tfs.sample_copy1 IS NOT NULL THEN 'toll_free_samples'
        WHEN tfs.welcome_msg IS NOT NULL THEN 'fallback_messages'
        ELSE 'no_samples'
    END as debug_sample_source,
    -- Add more diagnostic information
    CASE 
        WHEN sv.vertical_id IS NULL THEN 'no_sender_vertical'
        WHEN sm.vertical_id IS NULL THEN 'no_sample_msgs'
        WHEN tfs.id IS NULL THEN 'no_toll_free_samples'
        ELSE 'all_tables_present'
    END as debug_table_status,
    -- Add raw values for debugging
    tf.sender_id as debug_toll_free_sender_id,
    s.id as debug_sender_table_id,
    sv.sender_id as debug_sender_vertical_sender_id,
    sv.vertical_id as debug_sender_vertical_vertical_id
FROM public.toll_free tf
LEFT JOIN public.sender s ON tf.sender::text = s.sender::text
LEFT JOIN public.sender_vertical sv ON s.id = sv.sender_id
LEFT JOIN public.toll_free_samples tfs ON tf.id = tfs.id
LEFT JOIN public.sample_msgs sm ON sv.vertical_id = sm.vertical_id;

-- Add comment to explain the view's purpose
COMMENT ON VIEW public.toll_free_sms_samples IS 'View that combines toll-free records with their associated sample messages, including both template-based and custom samples'; 