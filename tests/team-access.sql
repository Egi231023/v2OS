begin;
do $test$
declare tid uuid:=gen_random_uuid(); token text:=repeat('a',64); result jsonb;
seed jsonb:='{"mode":"demo","entities":[],"actors":[{"id":"admin","active":true},{"id":"sales","active":true}]}';
begin
 perform public.os_team_manage('site:qa-owner','create',jsonb_build_object('id',tid,'name','QA team'),seed);
 begin perform public.os_team_read(tid,'site:qa-stranger');raise exception 'Unauthorized read accepted';exception when sqlstate 'PT403' then null;end;
 perform public.os_team_manage('site:qa-owner','invite',jsonb_build_object('teamId',tid,'tokenHash',token));
 perform public.os_team_manage('site:qa-member','join',jsonb_build_object('tokenHash',token,'name','Test member'));
 begin perform public.os_team_read(tid,'site:qa-member');raise exception 'Pending read accepted';exception when sqlstate 'PT403' then null;end;
 begin perform public.os_team_manage('site:qa-member','approve',jsonb_build_object('teamId',tid,'subject','site:qa-member','actorIds',jsonb_build_array('admin')));raise exception 'Self approval accepted';exception when sqlstate 'PT403' then null;end;
 perform public.os_team_manage('site:qa-owner','approve',jsonb_build_object('teamId',tid,'subject','site:qa-member','actorIds',jsonb_build_array('sales')));
 result:=public.os_team_read(tid,'site:qa-member');if result->'allowedActors'<>jsonb_build_array('sales') then raise exception 'Role mismatch';end if;
 begin perform public.os_team_commit(tid,'site:qa-member',1,seed,'admin','test','key','hash','{}','test');raise exception 'Unassigned actor commit accepted';exception when sqlstate 'PT403' then null;end;
 perform public.os_team_commit(tid,'site:qa-member',1,seed,'sales','test','key','hash','{}','test');
 perform public.os_team_manage('site:qa-owner','revoke',jsonb_build_object('teamId',tid,'subject','site:qa-member'));
 begin perform public.os_team_read(tid,'site:qa-member');raise exception 'Revoked read accepted';exception when sqlstate 'PT403' then null;end;
 begin perform public.os_team_commit(tid,'site:qa-member',2,seed,'sales','test','key2','hash','{}','test');raise exception 'Revoked commit accepted';exception when sqlstate 'PT403' then null;end;
end $test$;
select 'PASS team isolation, pending denial, owner-only approval, actor binding, valid commit, revoked read/write denial' as result;
rollback;
