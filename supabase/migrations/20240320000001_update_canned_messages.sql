-- Insert or update the standard message templates
INSERT INTO public.canned_messages (id, msg_type, template)
VALUES 
    (1, 'welcome', 
     '{brand}: Welcome to {business_name} Alerts! Msg&Data Rates may apply, 5 msgs/month. For help, reply HELP or call {phone}. To unsubscribe, reply STOP. Terms at: {terms}'),
    (2, 'help',
     '{brand}: Need help? Email us at: help@{sender}. Recurring msgs. Msg&Data Rates may apply. Reply STOP to end.'),
    (3, 'unsubscribe',
     '{brand}: Unsubscribe complete. You won''t receive further messages. For support, reach us at: help@{sender} or call {phone}'),
    (4, 'optin_msg',
     '{brand}: You''ve opted in to receive {business_name} alerts. Msg&Data Rates may apply. Reply HELP for help, STOP to cancel.')
ON CONFLICT (id) DO UPDATE 
SET 
    msg_type = EXCLUDED.msg_type,
    template = EXCLUDED.template;

-- Add comment to explain the purpose of these messages
COMMENT ON TABLE public.canned_messages IS 'Standard message templates for automated SMS responses'; 