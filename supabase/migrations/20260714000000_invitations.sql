-- ── 강사 섭외(invitations) 테이블 생성 ──────────────────────────────
-- 하나의 초대(invitation)는 여러 event_row와 여러 mentor를 대상으로 발송된다.
-- is_all_approval_required = false(기본, 부분수락): mentor가 개별 event_row 단위로 수락 가능
-- is_all_approval_required = true(모두수락): mentor는 초대에 포함된 모든 event_row를 한 번에 수락해야 하며,
--   부분적인 선택 수락은 불가능하다. (같은 프로그램을 같은 강사가 연속 진행해 강의 품질을 균일하게 유지하기 위함)
-- 배정은 "가장 먼저 수락한 멘토"가 event_rows.mentor_id에 원자적으로 등록되는 방식으로 처리하며,
-- 실제 배정/충돌 검사는 아래 accept_invitation_event_row / accept_invitation_all 함수를 통해서만 이루어진다.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invitation_status') then
    create type public.invitation_status as enum ('발송중', '마감', '만료', '취소');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invitation_mentor_status') then
    create type public.invitation_mentor_status as enum ('대기', '수락', '거절', '마감', '만료');
  end if;
end $$;

-- 초대 헤더
create table if not exists public.invitations (
  id                        uuid      primary key default gen_random_uuid(),
  is_all_approval_required  boolean   not null default false,
  status                    public.invitation_status not null default '발송중',
  expires_at                timestamp not null default (now() + interval '24 hours'),
  created_by                uuid      references public.admins(id) on delete set null,
  created_at                timestamp not null default now()
);

-- 초대에 포함된 event_row (여러 event/날짜에 걸칠 수 있어 event_id FK는 두지 않는다)
create table if not exists public.invitation_event_rows (
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  event_row_id  uuid not null references public.event_rows(id) on delete cascade,
  primary key (invitation_id, event_row_id)
);

create index if not exists invitation_event_rows_event_row_id_idx
  on public.invitation_event_rows(event_row_id);

-- 초대를 받은 멘토와 응답 상태
create table if not exists public.invitation_mentors (
  id             uuid      primary key default gen_random_uuid(),
  invitation_id  uuid      not null references public.invitations(id) on delete cascade,
  mentor_id      uuid      not null references public.mentors(id) on delete cascade,
  notified_at    timestamp,
  status         public.invitation_mentor_status not null default '대기',
  responded_at   timestamp,
  unique (invitation_id, mentor_id)
);

create index if not exists invitation_mentors_mentor_id_idx
  on public.invitation_mentors(mentor_id);

-- 멘토가 실제로 수락한 event_row (부분수락 시 개별 기록, 모두수락 시 전체 기록)
create table if not exists public.invitation_row_responses (
  id                    uuid      primary key default gen_random_uuid(),
  invitation_mentor_id  uuid      not null references public.invitation_mentors(id) on delete cascade,
  event_row_id          uuid      not null references public.event_rows(id) on delete cascade,
  accepted_at           timestamp not null default now(),
  unique (invitation_mentor_id, event_row_id)
);

create index if not exists invitation_row_responses_event_row_id_idx
  on public.invitation_row_responses(event_row_id);

-- 시간 충돌 검사에 사용되는 event_rows.mentor_id 인덱스
create index if not exists event_rows_mentor_id_idx
  on public.event_rows(mentor_id);

-- ── RLS ──────────────────────────────────────────────────────────────
-- 초대 관련 테이블은 다른 멘토의 정보가 노출되지 않도록, 관리자 또는
-- 본인이 초대 대상인 멘토만 조회 가능하도록 제한한다. 실제 수락/거절 처리는
-- 아래 SECURITY DEFINER 함수를 통해서만 이루어지므로 mentor에게 직접적인
-- insert/update 권한은 부여하지 않는다.

alter table public.invitations enable row level security;
alter table public.invitation_event_rows enable row level security;
alter table public.invitation_mentors enable row level security;
alter table public.invitation_row_responses enable row level security;

drop policy if exists "invitations_select" on public.invitations;
create policy "invitations_select" on public.invitations
  for select using (
    public.is_authenticated_admin()
    or exists (
      select 1 from public.invitation_mentors im
      where im.invitation_id = invitations.id and im.mentor_id = auth.uid()
    )
  );

drop policy if exists "invitations_write" on public.invitations;
create policy "invitations_write" on public.invitations
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "invitation_event_rows_select" on public.invitation_event_rows;
create policy "invitation_event_rows_select" on public.invitation_event_rows
  for select using (
    public.is_authenticated_admin()
    or exists (
      select 1 from public.invitation_mentors im
      where im.invitation_id = invitation_event_rows.invitation_id and im.mentor_id = auth.uid()
    )
  );

drop policy if exists "invitation_event_rows_write" on public.invitation_event_rows;
create policy "invitation_event_rows_write" on public.invitation_event_rows
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "invitation_mentors_select" on public.invitation_mentors;
create policy "invitation_mentors_select" on public.invitation_mentors
  for select using (
    public.is_authenticated_admin() or mentor_id = auth.uid()
  );

drop policy if exists "invitation_mentors_write" on public.invitation_mentors;
create policy "invitation_mentors_write" on public.invitation_mentors
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "invitation_row_responses_select" on public.invitation_row_responses;
create policy "invitation_row_responses_select" on public.invitation_row_responses
  for select using (
    public.is_authenticated_admin()
    or exists (
      select 1 from public.invitation_mentors im
      where im.id = invitation_row_responses.invitation_mentor_id and im.mentor_id = auth.uid()
    )
  );

drop policy if exists "invitation_row_responses_write" on public.invitation_row_responses;
create policy "invitation_row_responses_write" on public.invitation_row_responses
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- ── 수락/거절 함수 (SECURITY DEFINER로 RLS를 우회하여 원자적으로 배정) ──

-- 부분수락: event_row 단위로 개별 수락. is_all_approval_required = false인 초대에만 사용 가능.
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

  update public.event_rows set mentor_id = v_mentor_id where id = p_event_row_id;

  insert into public.invitation_row_responses (invitation_mentor_id, event_row_id)
  values (p_invitation_mentor_id, p_event_row_id)
  on conflict (invitation_mentor_id, event_row_id) do nothing;

  update public.invitation_mentors
    set status = '수락', responded_at = now()
    where id = p_invitation_mentor_id;

  -- 초대에 포함된 모든 event_row가 배정 완료되면 초대 자체를 마감 처리하고,
  -- 아직 응답하지 않은 다른 멘토들의 초대도 함께 마감 처리한다.
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

-- 모두수락: 초대에 포함된 모든 event_row를 한 번에 수락. is_all_approval_required = true인 초대에만 사용 가능.
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

-- 거절
create or replace function public.decline_invitation(
  p_invitation_mentor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_id uuid;
begin
  select mentor_id into v_mentor_id
  from public.invitation_mentors
  where id = p_invitation_mentor_id;

  if v_mentor_id is null then
    raise exception '존재하지 않는 초대입니다.';
  end if;

  if v_mentor_id <> auth.uid() then
    raise exception '본인에게 온 초대만 거절할 수 있습니다.';
  end if;

  update public.invitation_mentors
    set status = '거절', responded_at = now()
    where id = p_invitation_mentor_id;
end;
$$;

grant execute on function public.accept_invitation_event_row(uuid, uuid) to authenticated;
grant execute on function public.accept_invitation_all(uuid) to authenticated;
grant execute on function public.decline_invitation(uuid) to authenticated;

-- ── 만료 처리 배치 함수 ────────────────────────────────────────────
-- expires_at이 지났지만 accept/decline 시도가 없어 상태가 갱신되지 않은 초대를 정리한다.
-- Supabase pg_cron 확장을 활성화한 뒤 아래처럼 주기 실행을 등록할 수 있다.
--   select cron.schedule('expire_stale_invitations', '*/15 * * * *',
--     $$select public.expire_stale_invitations()$$);
create or replace function public.expire_stale_invitations()
returns void
language sql
security definer
set search_path = public
as $$
  update public.invitations
    set status = '만료'
    where status = '발송중' and expires_at < now();

  update public.invitation_mentors
    set status = '만료'
    where status = '대기'
      and invitation_id in (select id from public.invitations where status = '만료');
$$;
