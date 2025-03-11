-- Add message columns to toll_free_samples table if they don't exist
ALTER TABLE toll_free_samples
    ADD COLUMN IF NOT EXISTS welcome_msg text,
    ADD COLUMN IF NOT EXISTS help_msg text,
    ADD COLUMN IF NOT EXISTS unsubscribe_msg text; 