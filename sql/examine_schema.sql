-- First, let's see what columns exist in toll_free
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'toll_free'
ORDER BY ordinal_position;

-- Then examine sample data from toll_free
SELECT *
FROM toll_free
LIMIT 5;

-- Examine table structures
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('toll_free_samples', 'toll_free', 'sender')
ORDER BY table_name, ordinal_position;

-- Examine sample data and relationships
SELECT 
    tfs.id as sample_id,
    tfs.sample_copy1,
    tfs.sample_copy2,
    tfs.sample_copy3,
    tf.id as toll_free_id,
    tf.did,
    s.sender,
    s.brand
FROM toll_free_samples tfs
JOIN toll_free tf ON tf.id = tfs.id
JOIN sender s ON s.id = tf.sender_id
WHERE tfs.id = 1147; 