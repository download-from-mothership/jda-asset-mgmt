-- Insert or update the standard message templates
INSERT INTO public.canned_messages (id, msg_type, template)
VALUES 
    (1, 'welcome', 
     'Welcome to {brand}! Msg&data rates may apply. {business_name} alerts: up to 6/mo. Reply HELP for help, STOP to cancel. {terms}'),
    (2, 'help',
     'For help with {business_name} alerts, call {phone} or visit {sender}. Msg&data rates may apply.'),
    (3, 'unsubscribe',
     'You''ve been unsubscribed from {business_name} alerts. No more messages will be sent. For questions, call {phone}.')
ON CONFLICT (id) DO UPDATE 
SET 
    msg_type = EXCLUDED.msg_type,
    template = EXCLUDED.template;

-- Add comment to explain the purpose of these messages
COMMENT ON TABLE public.canned_messages IS 'Standard message templates for automated SMS responses'; 