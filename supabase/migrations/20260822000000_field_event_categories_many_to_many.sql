-- fields ↔ event_categories를 1:1에서 다대다로 전환한다.
-- 실제 프로그램 데이터를 보면 같은 분야(예: 뷰티, 예체능)가 여러 행사구분
-- (직업체험/문화예술체험/진로박람회/직업인특강 등)에 두루 쓰이는데, 지금까지는
-- fields.event_category_id 하나로만 묶여 있어 행사 등록 시 선택한 행사구분에
-- 속하지 않는 분야는 아예 보이지 않는 문제가 있었다.

-- ── 1. 조인 테이블 ──────────────────────────────────────────────────
create table if not exists public.field_event_categories (
  field_id          uuid not null references public.fields(id) on delete cascade,
  event_category_id uuid not null references public.event_categories(id) on delete cascade,
  primary key (field_id, event_category_id)
);

create index if not exists field_event_categories_event_category_id_idx
  on public.field_event_categories(event_category_id);

-- ── 2. 기존 1:1 데이터 백필 ─────────────────────────────────────────
insert into public.field_event_categories (field_id, event_category_id)
select id, event_category_id from public.fields where event_category_id is not null
on conflict do nothing;

-- ── 3. mentor_invitation_requests 뷰 재생성 ────────────────────────
-- 기존 뷰는 fields.event_category_id를 거쳐 experience_type을 구했는데, 분야가
-- 이제 행사구분 하나에 속하지 않으므로 event_rows가 실제로 속한 events.event_category_id
-- (뷰에 이미 join된 e)를 직접 써서 구한다. fields join은 더 이상 필요 없어 제거한다.
drop view public.mentor_invitation_requests;

create view public.mentor_invitation_requests
with (security_invoker = true) as
select
  im.id as invitation_mentor_id,
  im.mentor_id,
  im.status as mentor_status,
  im.responded_at,
  i.id as invitation_id,
  i.is_all_approval_required,
  i.status as invitation_status,
  i.expires_at,
  er.id as event_row_id,
  er.start_time,
  er.end_time,
  er.target,
  er.classroom,
  er.headcount,
  er.session_headcount,
  er.lecture_fee,
  er.lecture_fee_after_tax,
  e.id as event_id,
  e.name as event_name,
  ins.name as institution_name,
  ins.address as institution_address,
  opu.id as unit_id,
  opu.title as unit_title,
  op.name as program_name,
  o.name as occupation_name,
  ec.name as experience_type,
  er.mentor_id as assigned_mentor_id
from public.invitation_mentors im
join public.invitations i on i.id = im.invitation_id
join public.invitation_event_rows ier on ier.invitation_id = i.id
join public.event_rows er on er.id = ier.event_row_id
join public.events e on e.id = er.event_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.event_categories ec on ec.id = e.event_category_id;

grant select on public.mentor_invitation_requests to authenticated;

-- ── 4. 기존 1:1 컬럼 제거 ────────────────────────────────────────────
alter table public.fields drop column event_category_id;

-- ── 5. RLS ───────────────────────────────────────────────────────────
-- fields/occupations와 동일한 패턴: 관리자+멘토 조회, 관리자만 쓰기.
-- 승인 대기 중인 멘토도 카탈로그는 볼 수 있어야 하므로 추가 select 정책도 동일하게 얹는다.
alter table public.field_event_categories enable row level security;

drop policy if exists "field_event_categories_select" on public.field_event_categories;
create policy "field_event_categories_select" on public.field_event_categories
  for select using (public.is_authenticated_admin_or_mentor());

drop policy if exists "field_event_categories_select_authenticated" on public.field_event_categories;
create policy "field_event_categories_select_authenticated" on public.field_event_categories
  for select to authenticated using (true);

drop policy if exists "field_event_categories_write" on public.field_event_categories;
create policy "field_event_categories_write" on public.field_event_categories
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
