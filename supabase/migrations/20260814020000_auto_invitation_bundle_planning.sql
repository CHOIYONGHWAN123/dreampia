-- 자동 섭외 "묶음 계획" 기능
--
-- 지금까지는 어떤 프로그램 조합을 "모두수락" 한 건으로 묶을지를 관리자가 직접
-- 판단해서(같은 유닛 자동 묶음 또는 수동 체크) 지정해야 했다. 하지만 관리자가
-- mentor_occupation_programs 등록 현황을 다 알 수 없어 "이 조합이 실제로 가능한지"를
-- 미리 알기 어렵다는 문제가 있었다.
--
-- 이번 변경은 그 판단을 DB가 대신하게 한다:
--   1) preview_auto_bundles(row_ids) - 관리자가 "자동 섭외 시작"을 누르기 전에 호출.
--      전체 묶음이 가능하면 전체로, 안 되면 한 명씩 줄여가며 실제 후보가 있는 최대
--      크기의 묶음을 찾는다(3개 안되면 2개, 그래도 안되면 1개씩).
--   2) 관리자가 미리보기를 확인하고 승인하면 기존 createAutoInvitation을 묶음별로
--      호출해 실제 발송한다(이 부분은 TS 쪽에서 처리, DB는 계획만 제공).
--   3) 모두수락 묶음이 후보소진되면, advance_auto_invitation이 spawn_fallback_bundles를
--      통해 같은 계획 로직을 남은 일정에 대해 다시 돌려 더 작은 묶음으로 자동 재시도한다
--      (관리자가 다시 확인할 필요 없음). 상위 묶음을 거절한 강사도 하위 묶음은 완전히
--      새 초대(invitation)라 자동으로 다시 후보에 포함된다.
--
-- 같은 조합을 커버 가능한 강사가 여럿이면, mentors.score 대신 그 묶음에 포함된
-- program_score의 최솟값("약한 고리")으로 순위를 매긴다(모두수락 건에 한함).

-- ── 특정 일정 조합을 강사 한 명이 전부 수락 가능한지 판단할 때의 후보 수 ──────
-- find_next_auto_candidate_tier의 모두수락 분기와 동일한 조건(등록 여부 + 시간충돌)을
-- invitation_id 없이(아직 초대를 만들기 전 계획 단계이므로) 순수 event_row_id 배열
-- 기준으로 센다. 거절/만료 이력은 여기서 고려하지 않는다 - 이 함수는 "구조적으로
-- 가능한지"만 보고, 특정 초대의 응답 이력은 advance_auto_invitation/spawn_fallback_bundles
-- 쪽에서 별도로 처리한다(같은 조합을 다시 시도하지 않도록 skip 플래그로 방지).
create or replace function public.count_all_approval_candidates(p_event_row_ids uuid[])
returns int
language sql
security definer
set search_path = public
stable
as $$
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
    );
$$;

revoke execute on function public.count_all_approval_candidates(uuid[]) from public, anon, authenticated;

-- ── 묶음 계획 핵심 로직 ──────────────────────────────────────────────────
-- 남은 일정 전체를 한 묶음으로 시도 → 후보가 없으면 후보 수를 가장 많이 살리는
-- 일정 하나를 제외하고 재시도 → ... → 후보가 생기거나 1개만 남을 때까지 반복.
-- 그렇게 확정된 묶음을 제외한 나머지 일정으로 같은 과정을 반복해 전체를 소진한다.
--
-- p_skip_initial_full_check: true면 첫 라운드에서 "남은 일정 전체"를 후보 0으로
-- 간주하고 바로 축소를 시작한다 - 이미 후보소진이 확인된 초대의 일정으로 재계획할 때
-- (spawn_fallback_bundles) 동일한 조합을 또 후보 0인 채로 다시 확인하는 낭비를 피하기
-- 위함이다. 두 번째 라운드부터(축소되었거나 남은 일정으로 넘어간 뒤)는 이 스킵이
-- 적용되지 않는다.
create or replace function public.plan_auto_bundles_internal(
  p_event_row_ids uuid[],
  p_skip_initial_full_check boolean default false
)
returns table(bundle_index int, event_row_id uuid, candidate_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining uuid[] := p_event_row_ids;
  v_working uuid[];
  v_bundle_index int := 0;
  v_count int;
  v_row_id uuid;
  v_best_removed uuid;
  v_best_count_after int;
  v_try_count int;
  v_is_first_round boolean := true;
begin
  while coalesce(array_length(v_remaining, 1), 0) > 0 loop
    v_working := v_remaining;

    if v_is_first_round and p_skip_initial_full_check and array_length(v_working, 1) > 1 then
      v_count := 0;
    else
      v_count := public.count_all_approval_candidates(v_working);
    end if;

    while v_count = 0 and array_length(v_working, 1) > 1 loop
      v_best_removed := null;
      v_best_count_after := -1;

      foreach v_row_id in array v_working loop
        v_try_count := public.count_all_approval_candidates(
          (select array_agg(x) from unnest(v_working) as x where x <> v_row_id)
        );
        if v_try_count > v_best_count_after then
          v_best_count_after := v_try_count;
          v_best_removed := v_row_id;
        end if;
      end loop;

      v_working := (select array_agg(x) from unnest(v_working) as x where x <> v_best_removed);
      v_count := public.count_all_approval_candidates(v_working);
    end loop;

    foreach v_row_id in array v_working loop
      bundle_index := v_bundle_index;
      event_row_id := v_row_id;
      candidate_count := v_count;
      return next;
    end loop;

    v_remaining := (
      select coalesce(array_agg(x), array[]::uuid[])
      from unnest(v_remaining) as x
      where x <> all(v_working)
    );
    v_bundle_index := v_bundle_index + 1;
    v_is_first_round := false;
  end loop;

  return;
end;
$$;

revoke execute on function public.plan_auto_bundles_internal(uuid[], boolean) from public, anon, authenticated;

-- ── 관리자 앱에서 "자동 섭외 시작" 전에 호출하는 미리보기 ──────────────────
create or replace function public.preview_auto_bundles(p_event_row_ids uuid[])
returns table(bundle_index int, event_row_id uuid, candidate_count int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authenticated_admin() then
    raise exception '관리자만 조회할 수 있습니다.';
  end if;

  if p_event_row_ids is null or array_length(p_event_row_ids, 1) is null then
    return;
  end if;

  return query select * from public.plan_auto_bundles_internal(p_event_row_ids, false);
end;
$$;

grant execute on function public.preview_auto_bundles(uuid[]) to authenticated;

-- ── 모두수락 묶음이 후보소진되면 더 작은 묶음으로 자동 재시도 ──────────────
create or replace function public.spawn_fallback_bundles(p_event_row_ids uuid[], p_created_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_current_bundle int := -1;
  v_bundle_rows uuid[] := array[]::uuid[];
  v_new_invitation uuid;
begin
  for v_plan in
    select * from public.plan_auto_bundles_internal(p_event_row_ids, true)
    order by bundle_index, event_row_id
  loop
    if v_plan.bundle_index <> v_current_bundle then
      if v_current_bundle >= 0 then
        insert into public.invitations (is_all_approval_required, is_auto, created_by)
        values (coalesce(array_length(v_bundle_rows, 1), 0) > 1, true, p_created_by)
        returning id into v_new_invitation;

        insert into public.invitation_event_rows (invitation_id, event_row_id)
        select v_new_invitation, unnest(v_bundle_rows);

        perform public.advance_auto_invitation(v_new_invitation);
      end if;
      v_current_bundle := v_plan.bundle_index;
      v_bundle_rows := array[]::uuid[];
    end if;
    v_bundle_rows := v_bundle_rows || v_plan.event_row_id;
  end loop;

  if v_current_bundle >= 0 then
    insert into public.invitations (is_all_approval_required, is_auto, created_by)
    values (coalesce(array_length(v_bundle_rows, 1), 0) > 1, true, p_created_by)
    returning id into v_new_invitation;

    insert into public.invitation_event_rows (invitation_id, event_row_id)
    select v_new_invitation, unnest(v_bundle_rows);

    perform public.advance_auto_invitation(v_new_invitation);
  end if;
end;
$$;

revoke execute on function public.spawn_fallback_bundles(uuid[], uuid) from public, anon, authenticated;

-- ── advance_auto_invitation: 후보소진 시 모두수락 묶음(2개 이상)이면 자동 폴백 ──────
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
      set expires_at = now() + interval '24 hours'
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

  -- 모두수락 묶음(2개 이상)이 후보소진됐을 때만 더 작은 묶음으로 자동 재시도한다.
  -- 부분수락이거나 이미 1건짜리면 지금처럼 "자동후보소진"으로 관리자에게 넘긴다.
  if v_is_all and v_row_count > 1 then
    perform public.spawn_fallback_bundles(v_row_ids, v_created_by);
  end if;
end;
$$;

-- ── find_next_auto_candidate_tier: 모두수락 분기의 순위를 program_score 최솟값으로 ──
-- (부분수락 분기는 그대로 mentors.score 유지 - 묶음 전체를 커버해야 하는 게 아니라
-- 일정 중 하나만 맡으면 되므로 "묶음 최솟값" 개념이 맞지 않는다.)
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
revoke execute on function public.advance_auto_invitation(uuid) from public, anon, authenticated;
