-- 모든수락(is_all_approval_required) 시, 초대에 포함된 event_row들끼리 시간이 겹치면
-- 한 명의 강사가 전부 수락하는 것이 애초에 불가능하므로 이를 차단한다.
-- (기존 accept_invitation_all은 "이미 다른 곳에 배정된 멘토의 일정"과의 충돌만 검사했고,
--  같은 초대 안에 포함된 event_row끼리의 시간 겹침은 검사하지 않았다.)

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

  -- 초대에 포함된 event_row끼리 시간이 겹치면 한 명의 강사가 모두 수락하는 것 자체가 불가능하다.
  if exists (
    select 1
    from public.invitation_event_rows ier1
    join public.event_rows er1 on er1.id = ier1.event_row_id
    join public.invitation_event_rows ier2
      on ier2.invitation_id = ier1.invitation_id and ier2.event_row_id <> ier1.event_row_id
    join public.event_rows er2 on er2.id = ier2.event_row_id
    where ier1.invitation_id = v_invitation_id
      and er1.start_time < er2.end_time
      and er1.end_time > er2.start_time
  ) then
    raise exception '초대에 포함된 일정끼리 시간이 겹쳐 한 명의 강사가 모두 수락할 수 없습니다.';
  end if;

  -- 데드락 방지를 위해 event_row id 순으로 정렬하여 잠금
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
