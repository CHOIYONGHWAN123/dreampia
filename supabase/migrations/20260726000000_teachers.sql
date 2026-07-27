-- 선생님(학교측 계정) 테이블 추가
-- 회원가입/로그인 기능은 추후 구현 예정이며, 현재는 관리자가 Supabase Auth 계정을 생성/관리한다
-- (mentors의 createMentor와 동일하게 admin.auth.admin.createUser로 계정을 만들고
--  user_id에 그 auth uid를 저장한다. 로그인 계정을 만들지 않은 선생님은 user_id가 null).

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  user_id uuid references auth.users(id),
  name varchar not null,
  email varchar,
  created_at timestamp not null default now()
);

create index teachers_institution_id_idx on public.teachers(institution_id);

alter table public.teachers enable row level security;

-- 선생님 앱 로그인이 아직 없으므로 관리자만 관리한다.
-- 추후 로그인 기능 구현 시 mentors_self_select/mentors_self_update처럼
-- 본인 행 조회/수정 정책을 별도 마이그레이션으로 추가한다.
create policy "teachers_admin_all" on public.teachers
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
