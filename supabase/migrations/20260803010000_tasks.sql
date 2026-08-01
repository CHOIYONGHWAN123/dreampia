-- "나의 할일" 페이지를 위한 tasks 테이블 신설.
-- CLAUDE.md에 계획만 있고 구현된 적 없던 스키마를 실제로 만든다.

create type public.task_type as enum (
  '강사 섭외',
  '준비물 준비',
  '견적서 제작',
  '강사 섭외 전달',
  '학교 요청 사항 전달',
  '행정서류 전달',
  '계약 전달',
  '행사 안내',
  '행사 사진 전달',
  '보고서 전달'
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id),
  event_id uuid references public.events(id),
  task_type public.task_type not null,
  is_done boolean not null default false,
  created_at timestamp not null default now()
);

create index tasks_admin_id_idx on public.tasks(admin_id);
create index tasks_event_id_idx on public.tasks(event_id);

alter table public.tasks enable row level security;

-- 관리자 전용 테이블 (supply_logs와 동일 패턴)
create policy "tasks_select" on public.tasks
  for select using (public.is_authenticated_admin());
create policy "tasks_write" on public.tasks
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
