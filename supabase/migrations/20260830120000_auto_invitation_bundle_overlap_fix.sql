-- 버그: count_all_approval_candidates/find_next_auto_candidate_tier(모두수락 분기)가
-- "커버해야 할 프로그램 수"를 occupation_program_unit_id 기준으로 distinct 집계한다.
-- 그래서 같은 유닛을 쓰는 두 개의 event_row가 완전히 같은 시간대에 있어도(예: 같은
-- 프로그램을 두 반이 동시에 진행) "1개"로만 계산되어, 그 유닛에 등록된 강사 1명이면
-- 묶음 전체를 커버 가능하다고 잘못 판단했다 — 실제로는 한 사람이 동시에 두 반을
-- 가르칠 수 없으므로 애초에 불가능한 조합이다.
--
-- 이 조합은 발송 시점에 recruiting/actions.ts의 createInvitation/createAutoInvitation이
-- 별도로 겹침 검사를 해서 막아주긴 했지만(사후 방어), spawn_fallback_bundles처럼 그
-- TS 사전검사를 거치지 않는 DB 전용 경로도 있어 동일한 결함이 남아있었다. 근본적으로는
-- "묶음 계산" 단계에서부터 이런 조합을 절대 후보 있음으로 보고하지 않아야 한다.
--
-- 수정: 두 함수 모두, 대상 일정들 중 서로 시간이 겹치는 쌍이 하나라도 있으면(같은
-- 사람이 절대 동시에 소화할 수 없으므로) 무조건 후보 0명으로 처리한다. 이러면
-- plan_auto_bundles_internal의 기존 "후보 0 -> 후보 수가 최대가 되는 일정 하나를
-- 빼고 재시도" 로직이 자동으로 이 조합을 더 작은 묶음으로 쪼개게 된다.

create or replace function public.count_all_approval_candidates(p_event_row_ids uuid[])
returns int
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (
      select 1
      from public.event_rows a
      join public.event_rows b on a.id < b.id
      where a.id = any(p_event_row_ids)
        and b.id = any(p_event_row_ids)
        and a.start_time < b.end_time
        and a.end_time > b.start_time
    ) then 0
    else (
      select count(*)::int
      from public.mentors m
      where m.is_available = true
        and m.is_authenticated = true
        and (
          select count(distinct er.occupation_program_unit_id)
          from public.event_rows er
          where er.id = any(p_event_row_ids)
            and exists (
              select 1 from public.mentor_occupation_programs mop
              where mop.mentor_id = m.id and mop.occupation_program_unit_id = er.occupation_program_unit_id
            )
        ) = (
          select count(distinct er2.occupation_program_unit_id)
          from public.event_rows er2
          where er2.id = any(p_event_row_ids)
        )
        and not exists (
          select 1
          from public.event_rows target
          join public.event_rows other on other.mentor_id = m.id
          where target.id = any(p_event_row_ids)
            and not (other.id = any(p_event_row_ids))
            and other.start_time < target.end_time + interval '1 hour'
            and other.end_time > target.start_time - interval '1 hour'
        )
    )
  end;
$$;

revoke execute on function public.count_all_approval_candidates(uuid[]) from public, anon, authenticated;

create or replace function public.find_next_auto_candidate_tier(p_invitation_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_all_required boolean;
  v_candidates uuid[];
  v_has_internal_overlap boolean;
begin
  select is_all_approval_required into v_is_all_required
  from public.invitations where id = p_invitation_id;

  if v_is_all_required then
    select exists (
      select 1
      from public.invitation_event_rows ier_a
      join public.invitation_event_rows ier_b on ier_a.event_row_id < ier_b.event_row_id
      join public.event_rows a on a.id = ier_a.event_row_id
      join public.event_rows b on b.id = ier_b.event_row_id
      where ier_a.invitation_id = p_invitation_id
        and ier_b.invitation_id = p_invitation_id
        and a.start_time < b.end_time
        and a.end_time > b.start_time
    ) into v_has_internal_overlap;

    if v_has_internal_overlap then
      return array[]::uuid[];
    end if;

    with unit_count as (
      select count(distinct er.occupation_program_unit_id) as n
      from public.invitation_event_rows ier
      join public.event_rows er on er.id = ier.event_row_id
      where ier.invitation_id = p_invitation_id
    ),
    eligible as (
      select
        m.id,
        (
          select min(mop.program_score)
          from public.mentor_occupation_programs mop
          join public.invitation_event_rows ier on ier.invitation_id = p_invitation_id
          join public.event_rows er on er.id = ier.event_row_id
          where mop.mentor_id = m.id and mop.occupation_program_unit_id = er.occupation_program_unit_id
        ) as bundle_score
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
    where bundle_score = (select max(bundle_score) from eligible);
  else
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

revoke execute on function public.find_next_auto_candidate_tier(uuid) from public, anon, authenticated;
