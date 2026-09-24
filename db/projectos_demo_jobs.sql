create or replace function public.os_demo_lookup(p_subject text,p_actor text,p_action text,p_key text,p_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare x projectos_demo.idempotency%rowtype;
begin
 select i.* into x from projectos_demo.idempotency i join projectos_demo.workspaces w on w.id=i.workspace_id
 where w.subject=p_subject and i.actor_id=p_actor and i.operation=p_action and i.request_key=p_key;
 if not found then return null; end if;
 if x.payload_hash<>p_hash then raise exception 'Idempotency conflict' using errcode='23505'; end if;
 return x.result;
end $$;
revoke all on function public.os_demo_lookup(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.os_demo_lookup(text,text,text,text,text) to service_role;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- The workspace row lock serializes expiry with a reservation or a payment confirmation.
create or replace function projectos_demo.expire_holds()
returns integer language plpgsql security invoker set search_path='' as $$
declare w projectos_demo.workspaces%rowtype; e jsonb; x jsonb; next_entities jsonb;
 must_review boolean; new_status text; changed boolean; changes integer:=0; event_id uuid; note jsonb;
begin
 for w in select * from projectos_demo.workspaces where state->>'mode'='demo' for update skip locked loop
  changed:=false;
  for e in select value from jsonb_array_elements(w.state->'entities') where value->>'kind'='deal' and value->>'status'='hold' and (value->'data'->>'holdExpiresAt')::timestamptz<=now() loop
   must_review:=exists(select 1 from jsonb_array_elements(w.state->'entities') q where q->>'dealId'=e->>'id' and
    (q->>'kind'='document' and q->>'status' in ('out_for_signature','partially_signed','fully_signed') or q->>'kind'='payment' and q->>'status'='confirmed'));
   new_status:=case when must_review then 'review' else 'expired' end;
   select coalesce(jsonb_agg(case
     when value->>'id'=e->>'id' then jsonb_set(jsonb_set(value,'{status}',to_jsonb(new_status)), '{version}',to_jsonb((value->>'version')::int+1))
     when not must_review and value->>'kind'='allocation' and value->>'dealId'=e->>'id' and value->'data'->>'endedAt' is null then
      jsonb_set(jsonb_set(jsonb_set(value,'{status}','"ended"'::jsonb),'{data,endedAt}',to_jsonb(now()::text)),'{version}',to_jsonb((value->>'version')::int+1))
     else value end),'[]'::jsonb) into next_entities from jsonb_array_elements(w.state->'entities');
   if must_review then
    note=jsonb_build_object('id',gen_random_uuid(),'kind','task','organizationId',e->>'organizationId','projectId',e->>'projectId','dealId',e->>'id','ownerId','manager','title','Review expired hold','status','open','version',1,'createdAt',now(),'updatedAt',now(),'data',jsonb_build_object('entityId',e->>'id','dueAt',now(),'blocker','Signing or confirmed receipt needs review'));
    next_entities=next_entities||jsonb_build_array(note);
   else
    update projectos_demo.allocations set ended_at=now(),status='ended' where workspace_id=w.id and deal_id=e->>'id' and ended_at is null;
   end if;
   w.state=jsonb_set(w.state,'{entities}',next_entities);changed:=true;changes:=changes+1;
   insert into projectos_demo.audit(workspace_id,actor_id,action,entity_id,reason) values(w.id,'system','hold.'||new_status,e->>'id','Scheduled hold expiry') returning id into event_id;
   insert into projectos_demo.outbox(workspace_id,audit_id,event_type) values(w.id,event_id,'hold.'||new_status);
  end loop;
  if changed then update projectos_demo.workspaces set state=w.state,revision=revision+1,updated_at=now() where id=w.id; end if;
 end loop;
 return changes;
end $$;

create or replace function projectos_demo.process_events()
returns integer language plpgsql security invoker set search_path='' as $$
declare o projectos_demo.outbox%rowtype; w projectos_demo.workspaces%rowtype; ev projectos_demo.audit%rowtype; item jsonb;
 recipient text; note jsonb; processed integer:=0;
begin
 for o in select * from projectos_demo.outbox where status='pending' and next_attempt_at<=now() order by created_at for update skip locked limit 50 loop
  begin
   select * into w from projectos_demo.workspaces where id=o.workspace_id for update;
   select * into ev from projectos_demo.audit where id=o.audit_id;
   select value into item from jsonb_array_elements(w.state->'entities') where value->>'id'=ev.entity_id;
   recipient:=null;
   if o.event_type='lead.create' then recipient:=item->>'ownerId';
   elsif o.event_type='service.create' then recipient:='care';
   elsif o.event_type='service.assign' then recipient:=item->>'ownerId';
   elsif o.event_type='reservation.confirm' then recipient:='sales';
   elsif o.event_type in ('job.submit','hold.review','hold.expired') then recipient:='manager';
   end if;
   if recipient is not null and item is not null and exists(select 1 from jsonb_array_elements(w.state->'entities') g
      where g->>'kind'='grant' and g->>'status'='active' and g->'data'->>'actorId'=recipient and (g->'data'->'projectIds') ? (item->>'projectId')) then
    note=jsonb_build_object('id',gen_random_uuid(),'kind','notification','organizationId',item->>'organizationId','projectId',item->>'projectId','dealId',item->>'dealId','ownerId',recipient,'title',replace(o.event_type,'.',' '),'status','unread','version',1,'createdAt',now(),'updatedAt',now(),'data',jsonb_build_object('entityId',ev.entity_id,'eventId',ev.id));
    update projectos_demo.workspaces set state=jsonb_set(w.state,'{entities}',w.state->'entities'||jsonb_build_array(note)),revision=revision+1,updated_at=now() where id=w.id;
   end if;
   update projectos_demo.outbox set status='delivered',attempts=attempts+1 where id=o.id;
   processed:=processed+1;
  exception when others then
   update projectos_demo.outbox set status=case when attempts>=4 then 'failed' else 'pending' end,
     attempts=attempts+1,last_error=left(sqlerrm,200),next_attempt_at=now()+interval '5 minutes' where id=o.id;
  end;
 end loop;
 return processed;
end $$;
revoke all on function projectos_demo.expire_holds() from public,anon,authenticated;
revoke all on function projectos_demo.process_events() from public,anon,authenticated;
-- Cron executes with its own database role. No user-facing API grants are added.
create or replace function projectos_demo.run_jobs() returns void language plpgsql security invoker set search_path='' as $$
begin perform projectos_demo.expire_holds();perform projectos_demo.process_events();end $$;
revoke all on function projectos_demo.run_jobs() from public,anon,authenticated;
select cron.schedule('projectos-demo-jobs','* * * * *', 'select projectos_demo.run_jobs()');
