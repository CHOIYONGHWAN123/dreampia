-- 20260721010000_lecture_detail.sql에서 추가한 event_rows_protect_admin_only_columns
-- 트리거가 is_authenticated_admin()만 확인하는 바람에, 기존 accept_invitation_event_row /
-- accept_invitation_all(둘 다 SECURITY DEFINER지만 auth.uid()는 여전히 호출한 멘토 본인)
-- 이 event_rows.mentor_id를 채우는 UPDATE까지 트리거가 되돌려버리는 회귀가 발생했다.
-- 새로 만든 cancel_event_row_assignment도 같은 이유로 mentor_id를 null로 못 되돌렸다.
--
-- 세션 로컬 GUC 플래그로 "신뢰할 수 있는 RPC 내부에서의 변경"임을 표시하고, 트리거가
-- 이 플래그도 함께 확인하도록 고친다. 세 RPC 모두 mentor_id를 바꾸기 직전에 플래그를 켠다.

create or replace function public.event_rows_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_authenticated_admin()
    or current_setting('app.bypass_event_rows_protect', true) = 'true'
  ) then
    new.event_id := old.event_id;
    new.mentor_id := old.mentor_id;
    new.lecture_fee_payer_id := old.lecture_fee_payer_id;
    new.material_fee_payer_id := old.material_fee_payer_id;
    new.classroom := old.classroom;
    new.lecture_fee := old.lecture_fee;
    new.lecture_fee_after_tax := old.lecture_fee_after_tax;
    new.headcount := old.headcount;
    new.session_headcount := old.session_headcount;
    new.remarks := old.remarks;
    new.school_request_response := old.school_request_response;
    new.occupation_program_unit_id := old.occupation_program_unit_id;
    new.start_time := old.start_time;
    new.end_time := old.end_time;
    new.target := old.target;
    new.instructor_waiting_room := old.instructor_waiting_room;
  end if;
  return new;
end;
$$;

-- ── accept_invitation_event_row: mentor_id 배정 직전 플래그 설정 ──────────
create or replace function public.accept_invitation_event_row(
  p_invitation_mentor_id uuid,
  p_event_row_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id   uuid;
  v_mentor_id       uuid;
  v_is_all_required boolean;
  v_status          public.invitation_status;
  v_expires_at      timestamp;
  v_current_mentor  uuid;
  v_start_time      timestamp;
  v_end_time        timestamp;
  v_conflict_count  int;
  v_remaining       int;
begin
  select im.invitation_id, im.mentor_id, i.is_all_approval_required, i.status, i.expires_at
    into v_invitation_id, v_mentor_id, v_is_all_required, v_status, v_expires_at
  from public.invitation_mentors im
  join public.invitations i on i.id = im.invitation_id
  where im.id = p_invitation_mentor_id
  for update of im;

  if v_mentor_id is null then
    raise exception '존재하지 않는 초대입니다.';
  end if;

  if v_mentor_id <> auth.uid() then
    raise exception '본인에게 온 초대만 수락할 수 있습니다.';
  end if;

  if v_is_all_required then
    raise exception '모두 수락이 필요한 초대는 accept_invitation_all을 사용해야 합니다.';
  end if;

  if v_expires_at < now() then
    update public.invitations set status = '만료' where id = v_invitation_id and status = '발송중';
    raise exception '초대가 만료되었습니다.';
  end if;

  if v_status <> '발송중' then
    raise exception '이미 마감되었거나 취소/만료된 초대입니다.';
  end if;

  if not exists (
    select 1 from public.invitation_event_rows
    where invitation_id = v_invitation_id and event_row_id = p_event_row_id
  ) then
    raise exception '이 초대에 포함되지 않은 일정입니다.';
  end if;

  select mentor_id, start_time, end_time
    into v_current_mentor, v_start_time, v_end_time
  from public.event_rows
  where id = p_event_row_id
  for update;

  if v_current_mentor is not null then
    raise exception '이미 다른 강사가 배정된 일정입니다.';
  end if;

  select count(*) into v_conflict_count
  from public.event_rows er
  where er.mentor_id = v_mentor_id
    and er.id <> p_event_row_id
    and er.start_time < v_end_time
    and er.end_time > v_start_time;

  if v_conflict_count > 0 then
    raise exception '이미 배정된 다른 일정과 시간이 겹칩니다.';
  end if;

  perform set_config('app.bypass_event_rows_protect', 'true', true);
  update public.event_rows set mentor_id = v_mentor_id where id = p_event_row_id;

  insert into public.invitation_row_responses (invitation_mentor_id, event_row_id)
  values (p_invitation_mentor_id, p_event_row_id)
  on conflict (invitation_mentor_id, event_row_id) do nothing;

  update public.invitation_mentors
    set status = '수락', responded_at = now()
    where id = p_invitation_mentor_id;

  select count(*) into v_remaining
  from public.invitation_event_rows ier
  join public.event_rows er on er.id = ier.event_row_id
  where ier.invitation_id = v_invitation_id and er.mentor_id is null;

  if v_remaining = 0 then
    update public.invitations set status = '마감' where id = v_invitation_id;
    update public.invitation_mentors
      set status = '마감', responded_at = coalesce(responded_at, now())
      where invitation_id = v_invitation_id and status = '대기';
  end if;
end;
$$;

-- ── accept_invitation_all: mentor_id 배정 직전 플래그 설정 ────────────────
create or replace function public.accept_invitation_all(
  p_invitation_mentor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id   uuid;
  v_mentor_id       uuid;
  v_is_all_required boolean;
  v_status          public.invitation_status;
  v_expires_at      timestamp;
  v_row             record;
  v_conflict_count  int;
begin
  select im.invitation_id, im.mentor_id, i.is_all_approval_required, i.status, i.expires_at
    into v_invitation_id, v_mentor_id, v_is_all_required, v_status, v_expires_at
  from public.invitation_mentors im
  join public.invitations i on i.id = im.invitation_id
  where im.id = p_invitation_mentor_id
  for update of im;

  if v_mentor_id is null then
    raise exception '존재하지 않는 초대입니다.';
  end if;

  if v_mentor_id <> auth.uid() then
    raise exception '본인에게 온 초대만 수락할 수 있습니다.';
  end if;

  if not v_is_all_required then
    raise exception '부분 수락이 가능한 초대는 accept_invitation_event_row를 사용해야 합니다.';
  end if;

  if v_expires_at < now() then
    update public.invitations set status = '만료' where id = v_invitation_id and status = '발송중';
    raise exception '초대가 만료되었습니다.';
  end if;

  if v_status <> '발송중' then
    raise exception '이미 마감되었거나 취소/만료된 초대입니다.';
  end if;

  for v_row in
    select er.id, er.mentor_id, er.start_time, er.end_time
    from public.invitation_event_rows ier
    join public.event_rows er on er.id = ier.event_row_id
    where ier.invitation_id = v_invitation_id
    order by er.id
    for update of er
  loop
    if v_row.mentor_id is not null then
      raise exception '이미 다른 강사가 배정된 일정이 포함되어 있어 전체 수락이 불가능합니다.';
    end if;

    select count(*) into v_conflict_count
    from public.event_rows er2
    where er2.mentor_id = v_mentor_id
      and er2.id <> v_row.id
      and er2.start_time < v_row.end_time
      and er2.end_time > v_row.start_time;

    if v_conflict_count > 0 then
      raise exception '이미 배정된 다른 일정과 시간이 겹칩니다.';
    end if;
  end loop;

  perform set_config('app.bypass_event_rows_protect', 'true', true);
  update public.event_rows
    set mentor_id = v_mentor_id
    where id in (
      select event_row_id from public.invitation_event_rows where invitation_id = v_invitation_id
    );

  insert into public.invitation_row_responses (invitation_mentor_id, event_row_id)
  select p_invitation_mentor_id, event_row_id
  from public.invitation_event_rows
  where invitation_id = v_invitation_id
  on conflict (invitation_mentor_id, event_row_id) do nothing;

  update public.invitation_mentors
    set status = '수락', responded_at = now()
    where id = p_invitation_mentor_id;

  update public.invitations set status = '마감' where id = v_invitation_id;

  update public.invitation_mentors
    set status = '마감', responded_at = coalesce(responded_at, now())
    where invitation_id = v_invitation_id and status = '대기';
end;
$$;

-- ── cancel_event_row_assignment: mentor_id 해제 직전 플래그 설정 ──────────
create or replace function public.cancel_event_row_assignment(p_event_row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_id  uuid;
  v_start_time timestamp;
begin
  select mentor_id, start_time into v_mentor_id, v_start_time
  from public.event_rows
  where id = p_event_row_id
  for update;

  if v_mentor_id is null then
    raise exception '배정된 강사가 없는 일정입니다.';
  end if;

  if v_mentor_id <> auth.uid() then
    raise exception '본인에게 배정된 일정만 취소할 수 있습니다.';
  end if;

  if v_start_time is not null and v_start_time < now() then
    raise exception '이미 지난 일정은 취소할 수 없습니다.';
  end if;

  perform set_config('app.bypass_event_rows_protect', 'true', true);
  update public.event_rows
    set mentor_id = null, preparing = false, attendance = false
    where id = p_event_row_id;
end;
$$;
