-- 멘토 앱 "강의 일정 상세" 화면 지원.
--
-- 1) event_rows에 instructor_waiting_room(대기실) 컬럼 추가 — CLAUDE.md ERD 문서에는
--    있었지만 실제 라이브 테이블에는 없었다.
-- 2) 멘토 본인이 배정된 event_row의 preparing(행사준비)/attendance(출석)/
--    criminal_background_check(회보서 URL)만 직접 수정할 수 있게 허용한다.
--    나머지 컬럼은 mentors_protect_admin_only_columns와 동일한 패턴으로
--    관리자가 아니면 트리거가 되돌린다.
-- 3) event_photos 테이블(행사 사진, 멘토당 최대 2장은 클라이언트에서 강제) 신규 생성.
-- 4) 회보서/사진용 스토리지 버킷 2개 신규 생성 — 기존 agreement-file 등과 동일하게
--    public=true + self-write 정책. 단 폴더 키가 auth.uid()가 아니라 event_row_id다
--    (파일이 멘토 개인이 아니라 특정 일정에 귀속되므로).
-- 5) 강의 취소 RPC — event_rows.mentor_id를 다시 null로 되돌린다("나의 강의 일정"은
--    event_rows.mentor_id 기준으로 조회되므로 이게 곧 취소). invitation_mentors.status는
--    건드리지 않는다(초대 단위라 부분수락으로 받은 다른 일정 상태까지 틀어질 수 있음).
-- 6) 상세 조회용 뷰. mentors 테이블 SELECT RLS(id = auth.uid() or belongs_to = auth.uid())
--    때문에 입금자가 타인이면 join해도 조용히 null이 되므로, 뷰는 payer id만 반환하고
--    이름은 클라이언트가 이미 있는 get_mentor_names() RPC로 해석한다.

-- ── 1. 컬럼 추가 ──────────────────────────────────────────────────────
alter table public.event_rows
  add column if not exists instructor_waiting_room varchar;

-- ── 2. 멘토 본인 event_row 부분 수정 허용 ──────────────────────────────
drop policy if exists "event_rows_self_update" on public.event_rows;
create policy "event_rows_self_update" on public.event_rows
  for update using (mentor_id = auth.uid()) with check (mentor_id = auth.uid());

create or replace function public.event_rows_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authenticated_admin() then
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
    -- preparing / attendance / criminal_background_check는 멘토 본인이 수정 가능하도록 통과시킨다.
  end if;
  return new;
end;
$$;

drop trigger if exists event_rows_protect_admin_only_columns on public.event_rows;
create trigger event_rows_protect_admin_only_columns
  before update on public.event_rows
  for each row
  execute function public.event_rows_protect_admin_only_columns();

-- ── 3. 행사 사진 테이블 ─────────────────────────────────────────────────
create table if not exists public.event_photos (
  id            uuid      primary key default gen_random_uuid(),
  event_rows_id uuid      not null references public.event_rows(id) on delete cascade,
  url           varchar   not null,
  created_at    timestamp not null default now()
);

create index if not exists event_photos_event_rows_id_idx
  on public.event_photos(event_rows_id);

alter table public.event_photos enable row level security;

drop policy if exists "event_photos_self_select" on public.event_photos;
create policy "event_photos_self_select" on public.event_photos
  for select using (
    public.is_authenticated_admin()
    or exists (
      select 1 from public.event_rows er
      where er.id = event_photos.event_rows_id and er.mentor_id = auth.uid()
    )
  );

drop policy if exists "event_photos_self_insert" on public.event_photos;
create policy "event_photos_self_insert" on public.event_photos
  for insert to authenticated with check (
    exists (
      select 1 from public.event_rows er
      where er.id = event_photos.event_rows_id and er.mentor_id = auth.uid()
    )
  );

drop policy if exists "event_photos_self_delete" on public.event_photos;
create policy "event_photos_self_delete" on public.event_photos
  for delete using (
    exists (
      select 1 from public.event_rows er
      where er.id = event_photos.event_rows_id and er.mentor_id = auth.uid()
    )
  );

drop policy if exists "event_photos_admin_write" on public.event_photos;
create policy "event_photos_admin_write" on public.event_photos
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- ── 4. 스토리지 버킷 ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('criminal-background-check', 'criminal-background-check', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

drop policy if exists "criminal_background_check_self_write" on storage.objects;
create policy "criminal_background_check_self_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'criminal-background-check'
    and exists (
      select 1 from public.event_rows er
      where er.id::text = (storage.foldername(name))[1] and er.mentor_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'criminal-background-check'
    and exists (
      select 1 from public.event_rows er
      where er.id::text = (storage.foldername(name))[1] and er.mentor_id = auth.uid()
    )
  );

drop policy if exists "event_photos_bucket_self_write" on storage.objects;
create policy "event_photos_bucket_self_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'event-photos'
    and exists (
      select 1 from public.event_rows er
      where er.id::text = (storage.foldername(name))[1] and er.mentor_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'event-photos'
    and exists (
      select 1 from public.event_rows er
      where er.id::text = (storage.foldername(name))[1] and er.mentor_id = auth.uid()
    )
  );

-- ── 5. 강의 취소 RPC ────────────────────────────────────────────────────
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

  update public.event_rows
    set mentor_id = null, preparing = false, attendance = false
    where id = p_event_row_id;
end;
$$;

grant execute on function public.cancel_event_row_assignment(uuid) to authenticated;

-- ── 6. 상세 조회 뷰 ─────────────────────────────────────────────────────
create or replace view public.mentor_event_row_detail
with (security_invoker = true) as
select
  er.id as event_row_id,
  er.mentor_id,
  er.start_time,
  er.end_time,
  er.target,
  er.classroom,
  er.instructor_waiting_room,
  er.headcount,
  er.session_headcount,
  er.lecture_fee,
  er.lecture_fee_after_tax,
  er.lecture_fee_payer_id,
  er.preparing,
  er.attendance,
  er.criminal_background_check,
  e.id as event_id,
  e.name as event_name,
  e.notice,
  e.memo,
  e.student_rotation,
  c.name as campaign_name,
  ins.name as institution_name,
  ins.address as institution_address,
  ins.laptop_wifi_note,
  ins.indoor_shoes_note,
  ins.parking_note,
  opu.id as unit_id,
  opu.title as unit_title,
  opu.prep_by,
  opu.mentor_material_cost,
  opu.dreampia_material_cost,
  op.name as program_name,
  o.name as occupation_name,
  mentor.name as mentor_name,
  mentor.phone as mentor_phone,
  mop.material_fee_payer_id
from public.event_rows er
join public.events e on e.id = er.event_id
left join public.campaign c on c.id = e.campaign_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.mentors mentor on mentor.id = er.mentor_id
left join public.mentor_occupation_programs mop
  on mop.mentor_id = er.mentor_id and mop.occupation_program_unit_id = er.occupation_program_unit_id;

grant select on public.mentor_event_row_detail to authenticated;
