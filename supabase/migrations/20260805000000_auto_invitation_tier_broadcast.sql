-- 자동 섭외 로직 변경:
-- 1) 응답 대기시간 1시간 → 24시간으로 원복.
-- 2) 점수 1등 후보 1명에게만 보내던 것을, "최고점수 후보 전원"에게 동시 발송하고
--    먼저 수락하는 사람이 배정되는 방식으로 변경(동점자 broadcast + race).
--    한 티어(동점 그룹) 내에서 한 명이 거절해도 나머지가 아직 응답 전(대기)이면
--    캐스케이드하지 않고 기다린다 — 티어 전원이 거절/만료로 응답을 마쳐야 다음
--    등수로 넘어간다. accept_invitation_event_row/accept_invitation_all은 이미
--    "한 명이 수락하면 같은 초대의 나머지 대기 멘토를 자동 마감 처리"하므로
--    그대로 재사용한다.
-- 3) 후보 자격 판정을 "아직 배정 안 된 일정"만 기준으로 하도록 수정(부분수락 다건
--    초대에서 이미 배정된 일정 시간과의 충돌을 불필요하게 검사하던 문제 수정).

drop function if exists public.find_next_auto_candidate(uuid);

create or replace function public.find_next_auto_candidate_tier(p_invitation_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_all_required boolean;
  v_candidates uuid[];
begin
  select is_all_approval_required into v_is_all_required
  from public.invitations where id = p_invitation_id;

  if v_is_all_required then
    -- 모두수락: 부분 배정 상태가 없어 초대에 포함된 일정 전부가 항상 미배정 상태다.
    with unit_count as (
      select count(distinct er.occupation_program_unit_id) as n
      from public.invitation_event_rows ier
      join public.event_rows er on er.id = ier.event_row_id
      where ier.invitation_id = p_invitation_id
    ),
    eligible as (
      select m.id, m.score
      from public.mentors m, unit_count uc
      where m.is_available = true
        and m.is_authenticated = true
        and not exists (
          select 1 from public.invitation_mentors im
          where im.invitation_id = p_invitation_id
            and im.mentor_id = m.id
            and im.status in ('거절', '만료')
        )
        and (
          select count(distinct er.occupation_program_unit_id)
          from public.mentor_occupation_programs mop
          join public.invitation_event_rows ier on ier.invitation_id = p_invitation_id
          join public.event_rows er on er.id = ier.event_row_id
          where mop.mentor_id = m.id and mop.occupation_program_unit_id = er.occupation_program_unit_id
        ) = uc.n
        and not exists (
          select 1
          from public.invitation_event_rows ier
          join public.event_rows target on target.id = ier.event_row_id
          join public.event_rows other on other.mentor_id = m.id
          where ier.invitation_id = p_invitation_id
            and other.id <> target.id
            and other.start_time < target.end_time + interval '1 hour'
            and other.end_time > target.start_time - interval '1 hour'
        )
    )
    select array_agg(id) into v_candidates
    from eligible
    where score = (select max(score) from eligible);
  else
    -- 부분수락: 아직 배정 안 된(mentor_id is null) 일정만 기준으로 등록 여부/시간충돌을 판단한다.
    with eligible as (
      select m.id, m.score
      from public.mentors m
      where m.is_available = true
        and m.is_authenticated = true
        and not exists (
          select 1 from public.invitation_mentors im
          where im.invitation_id = p_invitation_id
            and im.mentor_id = m.id
            and im.status in ('거절', '만료')
        )
        and exists (
          select 1
          from public.mentor_occupation_programs mop
          join public.invitation_event_rows ier on ier.invitation_id = p_invitation_id
          join public.event_rows er on er.id = ier.event_row_id
          where er.mentor_id is null
            and mop.mentor_id = m.id and mop.occupation_program_unit_id = er.occupation_program_unit_id
        )
        and not exists (
          select 1
          from public.invitation_event_rows ier
          join public.event_rows target on target.id = ier.event_row_id and target.mentor_id is null
          join public.event_rows other on other.mentor_id = m.id
          where ier.invitation_id = p_invitation_id
            and other.id <> target.id
            and other.start_time < target.end_time + interval '1 hour'
            and other.end_time > target.start_time - interval '1 hour'
        )
    )
    select array_agg(id) into v_candidates
    from eligible
    where score = (select max(score) from eligible);
  end if;

  return coalesce(v_candidates, array[]::uuid[]);
end;
$$;

create or replace function public.advance_auto_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidates uuid[];
begin
  v_candidates := public.find_next_auto_candidate_tier(p_invitation_id);

  if v_candidates is null or array_length(v_candidates, 1) is null then
    update public.invitations set status = '후보소진' where id = p_invitation_id and status = '발송중';
    return;
  end if;

  insert into public.invitation_mentors (invitation_id, mentor_id, notified_at, status)
  select p_invitation_id, cand, now(), '대기'
  from unnest(v_candidates) as cand;

  update public.invitations
    set expires_at = now() + interval '24 hours'
    where id = p_invitation_id;
end;
$$;

create or replace function public.decline_invitation(
  p_invitation_mentor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_id     uuid;
  v_invitation_id uuid;
  v_is_auto       boolean;
  v_pending_left  int;
begin
  select im.mentor_id, im.invitation_id, i.is_auto
    into v_mentor_id, v_invitation_id, v_is_auto
  from public.invitation_mentors im
  join public.invitations i on i.id = im.invitation_id
  where im.id = p_invitation_mentor_id;

  if v_mentor_id is null then
    raise exception '존재하지 않는 초대입니다.';
  end if;

  if v_mentor_id <> auth.uid() then
    raise exception '본인에게 온 초대만 거절할 수 있습니다.';
  end if;

  update public.invitation_mentors
    set status = '거절', responded_at = now()
    where id = p_invitation_mentor_id;

  if v_is_auto then
    -- 같은 티어(동점 그룹)에 아직 응답 대기 중인 다른 멘토가 남아있으면 그들의 응답을
    -- 기다린다. 티어 전원이 거절/만료로 응답을 마쳤을 때만 다음 등수로 넘어간다.
    select count(*) into v_pending_left
    from public.invitation_mentors
    where invitation_id = v_invitation_id and status = '대기';

    if v_pending_left = 0 then
      perform public.advance_auto_invitation(v_invitation_id);
    end if;
  end if;
end;
$$;

-- find_next_auto_candidate_tier도 내부 전용 헬퍼라 anon/authenticated의 default
-- EXECUTE 권한을 회수한다(20260804030000/040000과 동일한 이유).
revoke execute on function public.find_next_auto_candidate_tier(uuid) from public, anon, authenticated;
