create table if not exists projectos_demo.operator_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 2 and 120),
  email text not null check (length(email) between 5 and 200),
  company text not null check (length(company) between 2 and 120),
  message text not null check (length(message) between 10 and 1500),
  status text not null default 'new',
  source text not null default 'projectos_website'
);
alter table projectos_demo.operator_inquiries enable row level security;
revoke all on projectos_demo.operator_inquiries from anon, authenticated, public;
grant select, insert on projectos_demo.operator_inquiries to service_role;
create index if not exists operator_inquiries_email_date on projectos_demo.operator_inquiries (lower(email), created_at desc);

create or replace function public.os_demo_inquiry(p_name text,p_email text,p_company text,p_message text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if length(p_name) not between 2 and 120 or length(p_company) not between 2 and 120
    or length(p_message) not between 10 and 1500 or length(p_email)>200 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 then raise exception 'Invalid inquiry'; end if;
 if (select count(*) from projectos_demo.operator_inquiries where email=lower(p_email) and created_at>now()-interval '1 hour')>=3
 then raise exception 'Inquiry rate limit'; end if;
 insert into projectos_demo.operator_inquiries(name,email,company,message)
 values(trim(p_name),lower(trim(p_email)),trim(p_company),trim(p_message));
 return true;
end $$;
revoke all on function public.os_demo_inquiry(text,text,text,text) from public,anon,authenticated;
grant execute on function public.os_demo_inquiry(text,text,text,text) to service_role;
