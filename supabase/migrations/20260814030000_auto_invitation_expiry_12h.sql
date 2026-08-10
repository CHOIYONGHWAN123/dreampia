-- 자동 섭외 응답 대기시간을 24시간 -> 12시간으로 변경.
create or replace function public.advance_auto_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidates uuid[];
  v_is_all boolean;
  v_created_by uuid;
  v_row_ids uuid[];
  v_row_count int;
begin
  v_candidates := public.find_next_auto_candidate_tier(p_invitation_id);

  if v_candidates is not null and array_length(v_candidates, 1) is not null then
    insert into public.invitation_mentors (invitation_id, mentor_id, notified_at, status)
    select p_invitation_id, cand, now(), '대기'
    from unnest(v_candidates) as cand;

    update public.invitations
      set expires_at = now() + interval '12 hours'
      where id = p_invitation_id;
    return;
  end if;

  update public.invitations set status = '후보소진' where id = p_invitation_id and status = '발송중';

  select is_all_approval_required, created_by into v_is_all, v_created_by
  from public.invitations where id = p_invitation_id;

  select array_agg(event_row_id) into v_row_ids
  from public.invitation_event_rows
  where invitation_id = p_invitation_id;

  v_row_count := coalesce(array_length(v_row_ids, 1), 0);

  if v_is_all and v_row_count > 1 then
    perform public.spawn_fallback_bundles(v_row_ids, v_created_by);
  end if;
end;
$$;

revoke execute on function public.advance_auto_invitation(uuid) from public, anon, authenticated;
