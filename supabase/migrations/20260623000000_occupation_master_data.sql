-- claude.md ERD 기준 직업/프로그램 마스터 데이터 테이블 생성 및 RLS 설정
-- 이미 일부 테이블/컬럼이 존재해도 안전하게 재실행 가능 (IF NOT EXISTS / DO 블록 사용)

-- ── enum 타입 ──────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'prep_by') then
    create type prep_by as enum ('강사', '드림피아', '모두가능');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'school_level') then
    create type school_level as enum ('초등', '중고등', '유치원');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'experience_type') then
    create type experience_type as enum ('초등 직업체험', '초등 문화예술체험', '중/고등 직업체험', '중/고등 문화예술체험');
  end if;
end $$;

-- ── 분야 ───────────────────────────────────

create table if not exists public.fields (
  id   uuid    primary key default gen_random_uuid(),
  name varchar not null
);

-- ── 직종(직업군) ───────────────────────────

create table if not exists public.occupations (
  id       uuid    primary key default gen_random_uuid(),
  name     varchar not null,
  field_id uuid    references public.fields (id)
);

alter table public.occupations add column if not exists field_id uuid references public.fields (id);

-- ── 직종에 따른 프로그램 ───────────────────

create table if not exists public.occupation_programs (
  id            uuid    primary key default gen_random_uuid(),
  occupation_id uuid    references public.occupations (id),
  name          varchar not null
);

alter table public.occupation_programs add column if not exists occupation_id uuid references public.occupations (id);

-- ── 프로그램 카테고리 ──────────────────────

create table if not exists public.program_categories (
  id              uuid    primary key default gen_random_uuid(),
  school_level    school_level,
  experience_type experience_type not null,
  sort_order      integer
);

alter table public.program_categories add column if not exists school_level school_level;
alter table public.program_categories add column if not exists sort_order integer;

-- ── 직업 프로그램의 유닛 ───────────────────
-- (id는 claude.md ERD에 명시되어 있지 않았으나, mentor_occupation_programs에서
--  occupation_program_unit.id를 참조하므로 pk로 추가함)

create table if not exists public.occupation_program_unit (
  id                        uuid      primary key default gen_random_uuid(),
  occupation_programs_id    uuid      references public.occupation_programs (id),
  material_cost_per_person  integer,
  prep_by                   prep_by,
  title                     varchar   not null,
  school_request_note       text,
  final_product_available   boolean,
  description               text,
  is_delivery_available     boolean   not null default false,
  program_category_id       uuid      references public.program_categories (id),
  created_at                timestamp not null default now()
);

alter table public.occupation_program_unit add column if not exists occupation_programs_id uuid references public.occupation_programs (id);
alter table public.occupation_program_unit add column if not exists material_cost_per_person integer;
alter table public.occupation_program_unit add column if not exists prep_by prep_by;
alter table public.occupation_program_unit add column if not exists school_request_note text;
alter table public.occupation_program_unit add column if not exists final_product_available boolean;
alter table public.occupation_program_unit add column if not exists description text;
alter table public.occupation_program_unit add column if not exists is_delivery_available boolean not null default false;
alter table public.occupation_program_unit add column if not exists program_category_id uuid references public.program_categories (id);
alter table public.occupation_program_unit add column if not exists created_at timestamp not null default now();

-- ── 멘토-프로그램 유닛 매핑 ────────────────
-- (claude.md의 unique index는 occupation_program_id로 적혀 있었으나 실제 컬럼명인
--  occupation_program_unit_id로 고쳐서 적용함)

create table if not exists public.mentor_occupation_programs (
  id                          uuid    primary key default gen_random_uuid(),
  mentor_id                   uuid    references public.mentors (id),
  occupation_program_unit_id  uuid    references public.occupation_program_unit (id),
  lecture_fee_payer_id        uuid    references public.mentors (id),
  material_fee_payer_id       uuid    references public.mentors (id),
  ppt_file_url                varchar
);

alter table public.mentor_occupation_programs add column if not exists mentor_id uuid references public.mentors (id);
alter table public.mentor_occupation_programs add column if not exists occupation_program_unit_id uuid references public.occupation_program_unit (id);
alter table public.mentor_occupation_programs add column if not exists lecture_fee_payer_id uuid references public.mentors (id);
alter table public.mentor_occupation_programs add column if not exists material_fee_payer_id uuid references public.mentors (id);
alter table public.mentor_occupation_programs add column if not exists ppt_file_url varchar;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mentor_occupation_programs_mentor_unit_unique'
  ) then
    alter table public.mentor_occupation_programs
      add constraint mentor_occupation_programs_mentor_unit_unique
      unique (mentor_id, occupation_program_unit_id);
  end if;
end $$;

-- ── RLS 헬퍼 함수 ──────────────────────────
-- 관리자 웹/멘토 웹이 같은 Supabase 프로젝트를 공유하므로
-- auth.uid()가 admins.id 또는 mentors.id와 일치하는지로 판별한다.

create or replace function public.is_authenticated_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where id = auth.uid() and is_authenticated = true
  );
$$;

create or replace function public.is_authenticated_admin_or_mentor()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_authenticated_admin()
    or exists (
      select 1 from public.mentors
      where id = auth.uid() and is_authenticated = true
    );
$$;

-- ── RLS 적용 ───────────────────────────────
-- 읽기: 인증된 관리자 + 인증된 멘토만 가능
-- 쓰기(insert/update/delete): 인증된 관리자만 가능

alter table public.fields enable row level security;
alter table public.occupations enable row level security;
alter table public.occupation_programs enable row level security;
alter table public.program_categories enable row level security;
alter table public.occupation_program_unit enable row level security;
alter table public.mentor_occupation_programs enable row level security;

drop policy if exists "fields_select" on public.fields;
create policy "fields_select" on public.fields
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "fields_write" on public.fields;
create policy "fields_write" on public.fields
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "occupations_select" on public.occupations;
create policy "occupations_select" on public.occupations
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "occupations_write" on public.occupations;
create policy "occupations_write" on public.occupations
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "occupation_programs_select" on public.occupation_programs;
create policy "occupation_programs_select" on public.occupation_programs
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "occupation_programs_write" on public.occupation_programs;
create policy "occupation_programs_write" on public.occupation_programs
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "program_categories_select" on public.program_categories;
create policy "program_categories_select" on public.program_categories
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "program_categories_write" on public.program_categories;
create policy "program_categories_write" on public.program_categories
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "occupation_program_unit_select" on public.occupation_program_unit;
create policy "occupation_program_unit_select" on public.occupation_program_unit
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "occupation_program_unit_write" on public.occupation_program_unit;
create policy "occupation_program_unit_write" on public.occupation_program_unit
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

drop policy if exists "mentor_occupation_programs_select" on public.mentor_occupation_programs;
create policy "mentor_occupation_programs_select" on public.mentor_occupation_programs
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "mentor_occupation_programs_write" on public.mentor_occupation_programs;
create policy "mentor_occupation_programs_write" on public.mentor_occupation_programs
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
