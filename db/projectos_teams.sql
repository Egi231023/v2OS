-- Shared fictional workspaces. Only trusted application-server identities reach these RPCs.
create table if not exists projectos_demo.teams(
 id uuid primary key,workspace_id uuid not null unique references projectos_demo.workspaces(id),owner_subject text not null,
 name text not null check(length(name) between 1 and 120),created_at timestamptz not null default now()
);
create table if not exists projectos_demo.team_members(
 team_id uuid not null references projectos_demo.teams(id),subject text not null,display_name text not null,
 status text not null check(status in ('pending','active','revoked')),actor_ids text[] not null default '{}',
 updated_at timestamptz not null default now(),primary key(team_id,subject)
);
create index if not exists os_team_member_subject on projectos_demo.team_members(subject,status);
create table if not exists projectos_demo.team_invites(
 token_hash text primary key check(length(token_hash)=64),team_id uuid not null references projectos_demo.teams(id),
 expires_at timestamptz not null,claimed_by text,created_at timestamptz not null default now()
);
alter table projectos_demo.teams enable row level security;
alter table projectos_demo.team_members enable row level security;
alter table projectos_demo.team_invites enable row level security;
revoke all on projectos_demo.teams,projectos_demo.team_members,projectos_demo.team_invites from public,anon,authenticated;
grant all on projectos_demo.teams,projectos_demo.team_members,projectos_demo.team_invites to service_role;

create or replace function public.os_team_manage(p_requester text,p_action text,p_data jsonb,p_seed jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t projectos_demo.teams%rowtype;w projectos_demo.workspaces%rowtype;i projectos_demo.team_invites%rowtype;
 target text;ids text[];v_result jsonb;actor text;
begin
 if p_requester not like 'site:%' or length(p_requester)>200 then raise exception 'Sign in required' using errcode='PT403';end if;
 if p_action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',t1.id,'name',t1.name,'status',m.status,'owner',t1.owner_subject=p_requester,'actorIds',m.actor_ids) order by t1.created_at),'[]'::jsonb) into v_result
   from projectos_demo.teams t1 join projectos_demo.team_members m on m.team_id=t1.id where m.subject=p_requester;return v_result;
 end if;
 if p_action='create' then
  if coalesce(length(trim(p_data->>'name')),0) not between 1 and 120 or p_seed->>'mode'<>'demo' then raise exception 'Invalid sandbox';end if;
  select * into t from projectos_demo.teams where id=(p_data->>'id')::uuid;
  if found then if t.owner_subject<>p_requester then raise exception 'Unavailable' using errcode='PT403';end if;return jsonb_build_object('id',t.id);end if;
  if (select count(*) from projectos_demo.teams where owner_subject=p_requester)>=5 then raise exception 'Maximum five team sandboxes';end if;
  insert into projectos_demo.workspaces(subject,state) values('site:team:'||(p_data->>'id'),p_seed) returning * into w;
  insert into projectos_demo.teams(id,workspace_id,owner_subject,name) values((p_data->>'id')::uuid,w.id,p_requester,trim(p_data->>'name')) returning * into t;
  insert into projectos_demo.team_members(team_id,subject,display_name,status,actor_ids) values(t.id,p_requester,'Workspace owner','active',array['admin']);
  insert into projectos_demo.audit(workspace_id,actor_id,action,reason) values(w.id,p_requester,'team.create','Created shared fictional sandbox');return jsonb_build_object('id',t.id);
 end if;
 if p_action='join' then
  select * into i from projectos_demo.team_invites where token_hash=p_data->>'tokenHash' for update;
  if not found or i.expires_at<=now() or i.claimed_by is not null and i.claimed_by<>p_requester then raise exception 'Invitation unavailable' using errcode='PT403';end if;
  insert into projectos_demo.team_members(team_id,subject,display_name,status) values(i.team_id,p_requester,left(coalesce(nullif(trim(p_data->>'name'),''),'Applicant'),120),'pending') on conflict(team_id,subject) do nothing;
  update projectos_demo.team_invites set claimed_by=p_requester where token_hash=i.token_hash;return jsonb_build_object('id',i.team_id,'status','Approval required');
 end if;
 select * into t from projectos_demo.teams where id=(p_data->>'teamId')::uuid;
 if not found or t.owner_subject<>p_requester then raise exception 'Owner access required' using errcode='PT403';end if;
 select * into w from projectos_demo.workspaces where id=t.workspace_id for update;
 if p_action='details' then
  select coalesce(jsonb_agg(jsonb_build_object('subject',m.subject,'name',m.display_name,'status',m.status,'actorIds',m.actor_ids)),'[]'::jsonb) into v_result from projectos_demo.team_members m where m.team_id=t.id;
  return jsonb_build_object('members',v_result,'actors',w.state->'actors');
 elsif p_action='invite' then
  if exists(select 1 from projectos_demo.team_invites where token_hash=p_data->>'tokenHash' and team_id=t.id) then return jsonb_build_object('expiresInHours',24);end if;
  if (select count(*) from projectos_demo.team_invites where team_id=t.id and expires_at>now() and claimed_by is null)>=20 then raise exception 'Use or expire existing invitations';end if;
  insert into projectos_demo.team_invites(token_hash,team_id,expires_at) values(p_data->>'tokenHash',t.id,now()+interval '24 hours');return jsonb_build_object('expiresInHours',24);
 elsif p_action in ('approve','revoke') then
  target=p_data->>'subject';if not exists(select 1 from projectos_demo.team_members where team_id=t.id and subject=target) then raise exception 'Applicant unavailable';end if;
  if p_action='revoke' then
   if target=t.owner_subject then raise exception 'Owner cannot revoke themselves';end if;
   update projectos_demo.team_members set status='revoked',actor_ids='{}',updated_at=now() where team_id=t.id and subject=target;
  else
   select array_agg(value) into ids from jsonb_array_elements_text(p_data->'actorIds');
   if coalesce(array_length(ids,1),0)=0 or array_length(ids,1)>12 then raise exception 'Select roles';end if;
   if target=t.owner_subject and not ('admin'=any(ids)) then raise exception 'Owner must retain administrator access';end if;
   foreach actor in array ids loop
    if not exists(select 1 from jsonb_array_elements(w.state->'actors') x where x->>'id'=actor and (x->>'active')::boolean) then raise exception 'Actor unavailable';end if;
    if exists(select 1 from projectos_demo.team_members m where m.team_id=t.id and m.subject<>target and m.status='active' and actor=any(m.actor_ids)) then raise exception 'Actor already assigned to another identity';end if;
   end loop;
   update projectos_demo.team_members set status='active',actor_ids=ids,updated_at=now() where team_id=t.id and subject=target;
  end if;
  insert into projectos_demo.audit(workspace_id,actor_id,action,reason) values(w.id,p_requester,'team.'||p_action,'Identity '||target);return jsonb_build_object('saved',true);
 end if;raise exception 'Unsupported team operation';
end $$;

create or replace function public.os_team_read(p_team uuid,p_requester text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w projectos_demo.workspaces%rowtype;m projectos_demo.team_members%rowtype;
begin
 select * into m from projectos_demo.team_members where team_id=p_team and subject=p_requester and status='active';if not found then raise exception 'Team access unavailable' using errcode='PT403';end if;
 select w1.* into w from projectos_demo.workspaces w1 join projectos_demo.teams t on t.workspace_id=w1.id where t.id=p_team;
 return jsonb_build_object('subject',w.subject,'revision',w.revision,'state',w.state,'updatedAt',w.updated_at,'allowedActors',to_jsonb(m.actor_ids));
end $$;

create or replace function public.os_team_commit(p_team uuid,p_requester text,p_expected bigint,p_state jsonb,p_actor text,p_action text,p_key text,p_hash text,p_result jsonb,p_reason text,p_entity text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w projectos_demo.workspaces%rowtype;
begin
 -- Lock matches revocation; membership is rechecked before committing.
 select w1.* into w from projectos_demo.workspaces w1 join projectos_demo.teams t on t.workspace_id=w1.id where t.id=p_team for update of w1;
 if not found or not exists(select 1 from projectos_demo.team_members m where m.team_id=p_team and m.subject=p_requester and m.status='active' and p_actor=any(m.actor_ids)) then raise exception 'Team role access unavailable' using errcode='PT403';end if;
 return public.os_demo_commit(w.subject,p_expected,p_state,p_actor,p_action,p_key,p_hash,p_result,p_reason,p_entity);
end $$;
revoke all on function public.os_team_manage(text,text,jsonb,jsonb),public.os_team_read(uuid,text),public.os_team_commit(uuid,text,bigint,jsonb,text,text,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.os_team_manage(text,text,jsonb,jsonb),public.os_team_read(uuid,text),public.os_team_commit(uuid,text,bigint,jsonb,text,text,text,text,jsonb,text,text) to service_role;
