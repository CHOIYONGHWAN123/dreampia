-- ── contract_status enum ─────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type public.contract_status as enum (
      '계약 시작 전', '진행중(단일계약)', '진행중(공동계약)',
      '최종일 계약', '계약 완료', '계약 없음'
    );
  end if;
end $$;

-- ── event_sessions 테이블 (다중 날짜+시간 행사 지원) ─────────────────
create table if not exists public.event_sessions (
  id         uuid      primary key default gen_random_uuid(),
  event_id   uuid      not null references public.events(id) on delete cascade,
  start_at   timestamp not null,
  end_at     timestamp,
  sort_order integer   not null default 0
);

create index if not exists event_sessions_event_id_idx on public.event_sessions(event_id);

alter table public.event_sessions enable row level security;

drop policy if exists "event_sessions_select" on public.event_sessions;
create policy "event_sessions_select" on public.event_sessions
  for select using (public.is_authenticated_admin_or_mentor());

drop policy if exists "event_sessions_write" on public.event_sessions;
create policy "event_sessions_write" on public.event_sessions
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- ── events: field_admin_id(단일) → field_admin_ids(배열) ─────────────
alter table public.events
  drop column if exists field_admin_id,
  add column if not exists field_admin_ids uuid[];

-- ── events: contract_status varchar → enum ────────────────────────────
alter table public.events
  alter column contract_status type public.contract_status
    using null::public.contract_status;
