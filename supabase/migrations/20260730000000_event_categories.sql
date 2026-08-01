-- fields 상위에 두는 최상위 분류(행사 구분: 직업체험/문화예술체험/진로박람회 등) 신설.
-- 기존에 하드코딩된 experience_type/lesson_category enum이 같은 값을 서로 다른 두 곳에서
-- 따로 들고 있었는데, event_categories 테이블로 통합해서 관리자가 마이그레이션 없이
-- UI에서 값을 추가할 수 있게 한다 (fields/occupations/occupation_programs와 동일한 방식).

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  sort_order integer,
  created_at timestamp not null default now()
);

alter table public.event_categories enable row level security;

create policy "event_categories_select" on public.event_categories
  for select using (public.is_authenticated_admin_or_mentor());
create policy "event_categories_write" on public.event_categories
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

insert into public.event_categories (name, sort_order) values
  ('직업체험', 1),
  ('문화예술체험', 2),
  ('진로박람회', 3);

-- fields: 분야 단위 1:1. 기존 행은 어느 행사구분에 속하는지 업무 판단이 필요해
-- nullable로 두고 관리자가 /programs 화면에서 직접 지정한다.
alter table public.fields add column event_category_id uuid references public.event_categories(id);

-- program_categories: 기존 값(직업체험/문화예술체험)이 이름과 그대로 매칭되므로 자동 백필.
alter table public.program_categories add column event_category_id uuid references public.event_categories(id);

update public.program_categories pc
set event_category_id = ec.id
from public.event_categories ec
where ec.name = pc.experience_type::text;

alter table public.program_categories alter column event_category_id set not null;

-- mentor_invitation_requests 뷰가 program_categories.experience_type을 그대로 노출하고 있어
-- 컬럼을 drop하기 전에 event_category_id/event_categories.name 참조로 먼저 바꿔준다.
-- (컬럼 타입이 enum -> varchar로 바뀌어 CREATE OR REPLACE로는 안 되고 재생성이 필요하다)
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
  -- CREATE OR REPLACE VIEW는 기존 출력 컬럼명을 바꿀 수 없어(멘토 앱이 이 이름으로 이미
  -- 소비 중일 수 있음), 컬럼명은 유지하고 값의 출처만 event_categories.name으로 바꾼다.
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
left join public.program_categories pc on pc.id = opu.program_category_id
left join public.event_categories ec on ec.id = pc.event_category_id;

grant select on public.mentor_invitation_requests to authenticated;

alter table public.program_categories drop column experience_type;

-- lesson_plans: 현재 데이터가 없어 바로 not null로 추가 가능.
alter table public.lesson_plans add column event_category_id uuid not null references public.event_categories(id);
alter table public.lesson_plans drop column lesson_category;
