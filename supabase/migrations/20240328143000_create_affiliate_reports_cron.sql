-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run fetch-affiliate-reports daily at 6am EST
SELECT cron.schedule(
  job_name := 'fetch-affiliate-reports-daily',           -- unique name for the cron job
  schedule := '0 6 * * *',                              -- run at 6am EST (UTC-5) every day
  command := $$
  SELECT net.http_post(
    url := 'https://miahiaqsjpnrppiusdvg.supabase.co/functions/v1/fetch-affiliate-reports',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) AS request_id;
  $$
);

-- Add comment to explain the cron job
COMMENT ON FUNCTION cron.schedule(text, text, text) IS 'Runs the fetch-affiliate-reports Edge Function daily at 6am EST to fetch affiliate reporting data'; 