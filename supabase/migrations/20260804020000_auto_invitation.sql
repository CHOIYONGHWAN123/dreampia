-- 강사 섭외 자동화: "여러 멘토에게 동시 발송 후 먼저 수락하는 사람이 배정"(기존 방식) 대신
-- "가능한 멘토 중 점수 1등에게만 발송 → 거절/무응답(1시간) 시 다음 등수에게 순차 발송".
--
-- 기존 invitations/invitation_mentors/invitation_event_rows 테이블과 accept 함수들은
-- 그대로 재사용한다(수동 방식도 계속 지원해야 해서). is_auto 플래그로 초대 건이
-- 자동/수동 중 어느 방식인지 구분하고, 자동 건은 항상 대기(pending) 멘토가 최대 1명이며
-- expires_at을 "다음 후보로 넘어가는 응답 대기시간"(1시간) 용도로 재사용한다.
--
-- 후보 순위는 매번(최초 발송 + 거절/만료로 넘어갈 때마다) 새로 계산한다 — 그 사이
-- 다른 스케줄이 잡히거나 가용 상태가 바뀔 수 있어서, 초대 시점에 순위를 스냅샷으로
-- 저장해두지 않는다. 지역(area) 매칭은 institutions.region1 데이터가 "부산"/"부산광역시"처럼
-- 표기가 섞여 있어 자동 매칭 시 엉뚱하게 걸러낼 위험이 있고, 요청 범위(시간+점수)에도
-- 없어서 이번 자동섭외 로직에는 포함하지 않는다(기존 수동 섭외도 동일).
--
-- 후보가 하나도 없으면 invitations.status를 '후보소진'으로 바꿔 관리자가 알아채고
-- 수동으로 개입할 수 있게 한다.

alter table public.invitations
  add column is_auto boolean not null default false;

-- ── 다음 자동섭외 후보 1명 조회 ──────────────────────────────────────────
-- 조건: 활동가능+인증됨, 이 초대 대상 유닛에 등록(부분수락=합집합/모두수락=전체 유닛 등록),
-- 이 초대에 포함된 모든 일정과 시간 충돌 없음(±1시간 버퍼), 이 초대에서 이미
-- 거절/만료로 시도한 적 없음. 점수 내림차순, 동점이면 랜덤.
create or replace function public.find_next_auto_candidate(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_all_required boolean;
  v_unit_count int;
  v_candidate uuid;
begin
  select is_all_approval_required into v_is_all_required
  from public.invitations where id = p_invitation_id;

  select count(distinct er.occupation_program_unit_id) into v_unit_count
  from public.invitation_event_rows ier
  join public.event_rows er on er.id = ier.event_row_id
  where ier.invitation_id = p_invitation_id;

  if v_is_all_required then
    select m.id into v_candidate
    from public.mentors m
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
      ) = v_unit_count
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
    order by m.score desc, random()
    limit 1;
  else
    select m.id into v_candidate
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
        where mop.mentor_id = m.id and mop.occupation_program_unit_id = er.occupation_program_unit_id
      )
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
    order by m.score desc, random()
    limit 1;
  end if;

  return v_candidate;
end;
$$;

-- ── 다음 후보에게 발송(없으면 후보소진 처리) ────────────────────────────
create or replace function public.advance_auto_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate uuid;
begin
  v_candidate := public.find_next_auto_candidate(p_invitation_id);

  if v_candidate is null then
    update public.invitations set status = '후보소진' where id = p_invitation_id and status = '발송중';
    return;
  end if;

  insert into public.invitation_mentors (invitation_id, mentor_id, notified_at, status)
  values (p_invitation_id, v_candidate, now(), '대기');

  update public.invitations
    set expires_at = now() + interval '1 hour'
    where id = p_invitation_id;
end;
$$;

-- ── 자동섭외 시작 (관리자 앱에서 호출) ──────────────────────────────────
create or replace function public.create_auto_invitation(
  p_event_row_ids uuid[],
  p_is_all_approval_required boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
begin
  if not public.is_authenticated_admin() then
    raise exception '관리자만 자동 섭외를 시작할 수 있습니다.';
  end if;

  if p_event_row_ids is null or array_length(p_event_row_ids, 1) is null then
    raise exception '선택된 일정이 없습니다.';
  end if;

  insert into public.invitations (is_all_approval_required, is_auto, created_by)
  values (p_is_all_approval_required, true, auth.uid())
  returning id into v_invitation_id;

  insert into public.invitation_event_rows (invitation_id, event_row_id)
  select v_invitation_id, unnest(p_event_row_ids);

  perform public.advance_auto_invitation(v_invitation_id);

  return v_invitation_id;
end;
$$;

grant execute on function public.create_auto_invitation(uuid[], boolean) to authenticated;

-- ── 거절 시 자동섭외 건이면 다음 후보로 캐스케이드 ──────────────────────
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
    perform public.advance_auto_invitation(v_invitation_id);
  end if;
end;
$$;

-- ── 만료 배치: 자동섭외 건은 만료 시에도 다음 후보로 캐스케이드 ─────────
create or replace function public.expire_stale_invitations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
begin
  for v_inv in
    select id, is_auto from public.invitations
    where status = '발송중' and expires_at < now()
  loop
    update public.invitation_mentors
      set status = '만료'
      where invitation_id = v_inv.id and status = '대기';

    if v_inv.is_auto then
      perform public.advance_auto_invitation(v_inv.id);
    else
      update public.invitations set status = '만료' where id = v_inv.id;
    end if;
  end loop;
end;
$$;

-- ── 만료 배치 주기 실행 등록 (자동섭외 1시간 대기 캐스케이드가 실제로 동작하려면 필요) ──
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'expire_stale_invitations',
  '*/10 * * * *',
  $$select public.expire_stale_invitations()$$
);
