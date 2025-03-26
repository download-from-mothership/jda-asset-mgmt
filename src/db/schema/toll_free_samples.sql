-- toll_free_samples table definition
create table public.toll_free_samples (
  id bigint not null,
  sample_copy1 text null,
  sample_copy2 text null,
  sample_copy3 text null,
  welcome_msg text null,
  help_msg text null,
  unsubscribe_msg text null,
  optin_msg text null,
  constraint toll_free_samples_pkey primary key (id),
  constraint toll_free_samples_id_fkey foreign key (id) references toll_free (id) on delete cascade
) tablespace pg_default;

-- toll_free_sms_samples view definition (for initial samples)
create or replace view public.toll_free_sms_samples as
select 
  tf.id,
  sm.sample1,
  sm.sample2,
  sm.sample3
from toll_free tf
left join sender s on tf.sender_id = s.id
left join sender_vertical sv on s.id = sv.sender_id
left join sample_msgs sm on sv.vertical_id = sm.vertical_id;

-- Function to update canned messages
create or replace function public.update_toll_free_messages(toll_free_id bigint)
returns void
language plpgsql
as $$
begin
  -- Function updates welcome_msg, help_msg, unsubscribe_msg, and optin_msg
  -- in toll_free_samples using templates from canned_messages
  -- based on their respective msg_type
  -- Placeholders like {brand}, {business_name}, {sender}, {phone}, {terms}
  -- are replaced with actual values from the sender record
end;
$$; 