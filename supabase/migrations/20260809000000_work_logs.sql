-- tasks(할일 목록, 미구현 상태였고 실사용 0건)를 work_logs(업무 로그)로 교체한다.
-- tasks는 is_done으로 상태를 갖는 "할일" 개념이었는데, 실제로는 "관리자가 이 행사에
-- 이 작업을 했다"는 기록(로그)이 필요해서 방향을 바꿨다. task_type enum은 그대로 재사용.

drop table public.tasks;

create table public.work_logs (
  id         uuid      primary key default gen_random_uuid(),
  admin_id   uuid      not null references public.admins(id),
  event_id   uuid      references public.events(id),
  task_type  public.task_type not null,
  created_at timestamp not null default now()
);

create index work_logs_admin_id_idx on public.work_logs(admin_id);
create index work_logs_event_id_idx on public.work_logs(event_id);

alter table public.work_logs enable row level security;

-- supply_logs와 동일한 패턴: 관리자 전용 로그 테이블
create policy "work_logs_select" on public.work_logs
  for select using (public.is_authenticated_admin());
create policy "work_logs_write" on public.work_logs
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
