-- 행사별 공지사항. 전체 공지(announcements)는 모든 멘토에게 보이는 게시판이지만,
-- 이건 그 행사에 배정된 강사(event_rows.mentor_id)에게만 보이는 별도 피드다.
-- events.notice(단일 텍스트, 덮어쓰는 상시 메모)와는 성격이 달라 분리한다 — 관리자가
-- 보낼 때마다 새 글이 쌓이고, 각 건마다 푸시 발송 이력(push_notifications)이 남는다.
create table public.event_notices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title varchar not null,
  content text not null,
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now()
);

create index event_notices_event_id_idx on public.event_notices(event_id);

alter table public.event_notices enable row level security;

create policy "event_notices_admin_all" on public.event_notices
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- 멘토는 자신이 배정된 행사(event_rows.mentor_id = 본인)의 공지만 조회 가능. 배정이 나중에
-- 생겨도(예: 재배정) 그 시점부터는 과거 공지까지 함께 보이는 게 맞다고 판단해 "현재 배정
-- 여부"만 기준으로 삼는다.
create policy "event_notices_mentor_select" on public.event_notices
  for select to authenticated
  using (
    exists (
      select 1 from public.event_rows
      where event_rows.event_id = event_notices.event_id
        and event_rows.mentor_id = auth.uid()
    )
  );
