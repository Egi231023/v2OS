-- Additive, isolated demo schema. The existing public.companies/projects/units remain untouched.
create schema if not exists projectos_demo;
create table if not exists projectos_demo.workspaces(
 id uuid primary key default gen_random_uuid(),
 subject text not null unique check(length(subject) between 10 and 200),
 revision bigint not null default 1 check(revision>0),
 state jsonb not null check(jsonb_typeof(state)='object'),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists projectos_demo.idempotency(
 workspace_id uuid not null references projectos_demo.workspaces(id) on delete cascade,
 actor_id text not null, operation text not null, request_key text not null,
 payload_hash text not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(workspace_id,actor_id,operation,request_key)
);
create table if not exists projectos_demo.allocations(
 workspace_id uuid not null references projectos_demo.workspaces(id) on delete cascade,
 id text not null,item_id text not null,deal_id text not null,status text not null,
 ended_at timestamptz,primary key(workspace_id,id)
);
create unique index if not exists os_demo_one_active_allocation on projectos_demo.allocations(workspace_id,item_id) where ended_at is null;
create table if not exists projectos_demo.audit(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references projectos_demo.workspaces(id) on delete cascade,
 actor_id text not null,action text not null,entity_id text,reason text not null,
 at timestamptz not null default now()
);
create table if not exists projectos_demo.outbox(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references projectos_demo.workspaces(id) on delete cascade,
 audit_id uuid not null references projectos_demo.audit(id),event_type text not null,status text not null default 'pending' check(status in ('pending','delivered','failed')),
 attempts int not null default 0,next_attempt_at timestamptz not null default now(),last_error text,created_at timestamptz not null default now()
);
create index if not exists os_demo_outbox_due on projectos_demo.outbox(next_attempt_at) where status='pending';
alter table projectos_demo.workspaces enable row level security;
alter table projectos_demo.idempotency enable row level security;
alter table projectos_demo.allocations enable row level security;
alter table projectos_demo.audit enable row level security;
alter table projectos_demo.outbox enable row level security;
revoke all on schema projectos_demo from public,anon,authenticated;
revoke all on all tables in schema projectos_demo from public,anon,authenticated;
grant usage on schema projectos_demo to service_role;
grant all on all tables in schema projectos_demo to service_role;

-- Both public RPC entrypoints are SECURITY INVOKER and executable only by service_role.
-- Edge function authenticates a server-to-server secret before using its secret Supabase key.
create or replace function public.os_demo_read(p_subject text,p_seed jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r projectos_demo.workspaces%rowtype;
begin
 if length(p_subject) not between 10 and 200 or jsonb_typeof(p_seed)<>'object' then raise exception 'Invalid workspace initialization'; end if;
 insert into projectos_demo.workspaces(subject,state) values(p_subject,p_seed) on conflict(subject) do nothing;
 select * into r from projectos_demo.workspaces where subject=p_subject;
 return jsonb_build_object('revision',r.revision,'state',r.state,'updatedAt',r.updated_at);
end $$;
create or replace function public.os_demo_commit(
 p_subject text,p_expected bigint,p_state jsonb,p_actor text,p_action text,
 p_key text,p_hash text,p_result jsonb,p_reason text,p_entity text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r projectos_demo.workspaces%rowtype; prev projectos_demo.idempotency%rowtype;
 item jsonb; ref jsonb; allocation jsonb; schedule jsonb; payment jsonb;
 v_used numeric;v_paid numeric;v_audit uuid;v_result jsonb;
begin
 select * into r from projectos_demo.workspaces where subject=p_subject for update;
 if not found then raise exception 'Workspace not found'; end if;
 select * into prev from projectos_demo.idempotency where workspace_id=r.id and actor_id=p_actor and operation=p_action and request_key=p_key;
 if found then
   if prev.payload_hash<>p_hash then raise exception 'Idempotency key reused with different input' using errcode='23505'; end if;
   return prev.result;
 end if;
 if r.revision<>p_expected then raise exception 'Stale workspace; refresh before retry' using errcode='PT409'; end if;
 if jsonb_typeof(p_state->'entities')<>'array' or jsonb_typeof(p_state->'actors')<>'array' or p_state->>'mode'<>'demo' then raise exception 'Invalid workspace'; end if;
 -- Every project-scoped record belongs to its project's owning organization.
 for item in select value from jsonb_array_elements(p_state->'entities') loop
   if item ? 'projectId' and item->>'projectId' is not null then
     select value into ref from jsonb_array_elements(p_state->'entities') where value->>'id'=item->>'projectId' and value->>'kind'='project';
     if ref is null or ref->>'organizationId'<>item->>'organizationId' then raise exception 'Cross-organization record'; end if;
   end if;
   if item ? 'dealId' and item->>'dealId' is not null and item->>'kind'<>'deal' then
     select value into ref from jsonb_array_elements(p_state->'entities') where value->>'id'=item->>'dealId' and value->>'kind'='deal';
     if ref is null or ref->>'projectId'<>item->>'projectId' then raise exception 'Cross-project deal reference'; end if;
   end if;
   if item->>'kind'='schedule' and item->>'status'='active' then
     select coalesce(sum((value->'data'->>'amountCents')::numeric),0) into v_paid from jsonb_array_elements(p_state->'entities')
      where value->>'kind'='payment_allocation' and value->>'status'='active' and value->'data'->>'scheduleId'=item->>'id';
     if v_paid>(item->'data'->>'amountCents')::numeric then raise exception 'Instalment overallocated'; end if;
   end if;
   if item->>'kind'='payment' and item->>'status'='confirmed' and item->'data'->>'direction'='receipt' then
     select coalesce(sum((value->'data'->>'amountCents')::numeric),0) into v_used from jsonb_array_elements(p_state->'entities')
      where value->>'kind'='payment_allocation' and value->>'status'='active' and value->'data'->>'paymentId'=item->>'id';
     if v_used>(item->'data'->>'amountCents')::numeric-coalesce((item->'data'->>'refundedCents')::numeric,0) then raise exception 'Receipt overallocated'; end if;
   end if;
   if item->>'kind'='allocation' then
     select value into ref from jsonb_array_elements(p_state->'entities') where value->>'id'=item->'data'->>'itemId' and value->>'kind'='inventory';
     if ref is null or ref->>'projectId'<>item->>'projectId' or ref->>'organizationId'<>item->>'organizationId' then raise exception 'Invalid inventory reference'; end if;
   end if;
   if item->>'kind'='payment_allocation' and item->>'status'='active' then
     if (item->'data'->>'amountCents')::numeric<=0 or (item->'data'->>'amountCents')::numeric<>trunc((item->'data'->>'amountCents')::numeric) then raise exception 'Invalid allocation amount'; end if;
     select value into payment from jsonb_array_elements(p_state->'entities') where value->>'id'=item->'data'->>'paymentId' and value->>'kind'='payment';
     select value into schedule from jsonb_array_elements(p_state->'entities') where value->>'id'=item->'data'->>'scheduleId' and value->>'kind'='schedule';
     if payment is null or schedule is null or payment->>'status'<>'confirmed' or payment->'data'->>'direction'<>'receipt'
       or payment->>'dealId'<>item->>'dealId' or schedule->>'dealId'<>item->>'dealId'
       or payment->'data'->>'currency'<>schedule->'data'->>'currency' then raise exception 'Invalid payment allocation reference'; end if;
   end if;
 end loop;
 delete from projectos_demo.allocations where workspace_id=r.id;
 for allocation in select value from jsonb_array_elements(p_state->'entities') where value->>'kind'='allocation' loop
  insert into projectos_demo.allocations(workspace_id,id,item_id,deal_id,status,ended_at)
  values(r.id,allocation->>'id',allocation->'data'->>'itemId',allocation->>'dealId',allocation->>'status',nullif(allocation->'data'->>'endedAt','')::timestamptz);
 end loop;
 update projectos_demo.workspaces set state=p_state,revision=r.revision+1,updated_at=now() where id=r.id;
 insert into projectos_demo.audit(workspace_id,actor_id,action,entity_id,reason) values(r.id,p_actor,p_action,p_entity,left(coalesce(p_reason,p_action),500)) returning id into v_audit;
 insert into projectos_demo.outbox(workspace_id,audit_id,event_type) values(r.id,v_audit,p_action);
 v_result=jsonb_build_object('revision',r.revision+1,'result',p_result);
 insert into projectos_demo.idempotency(workspace_id,actor_id,operation,request_key,payload_hash,result)
 values(r.id,p_actor,p_action,p_key,p_hash,v_result);
 return v_result;
end $$;
revoke all on function public.os_demo_read(text,jsonb) from public,anon,authenticated;
revoke all on function public.os_demo_commit(text,bigint,jsonb,text,text,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.os_demo_read(text,jsonb) to service_role;
grant execute on function public.os_demo_commit(text,bigint,jsonb,text,text,text,text,jsonb,text,text) to service_role;
