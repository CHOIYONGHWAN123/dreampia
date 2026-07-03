-- ── 준비물 / 재고 테이블 생성 ──────────────────────────────────────

-- stock_type enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stock_type') then
    create type public.stock_type as enum ('total', 'kit');
  end if;
end $$;

-- supplies
create table if not exists public.supplies (
  id                         uuid      primary key default gen_random_uuid(),
  occupation_program_unit_id uuid      references public.occupation_program_unit(id) on delete set null,
  qty_per_person             integer   not null default 1,
  kit_threshold              integer,
  max_daily_stock            integer,
  is_consumable              boolean   not null default false,
  memo                       text,
  updated_at                 timestamp not null default now()
);

-- supply_logs
create table if not exists public.supply_logs (
  id         uuid        primary key default gen_random_uuid(),
  supply_id  uuid        references public.supplies(id) on delete cascade,
  admin_id   uuid        references public.admins(id) on delete set null,
  event_id   uuid        references public.events(id) on delete set null,
  stock_type public.stock_type not null,
  delta      integer     not null,
  reason     text,
  created_at timestamp   not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────

alter table public.supplies enable row level security;
alter table public.supply_logs enable row level security;

-- supplies: 관리자·멘토 조회 / 관리자만 수정
drop policy if exists "supplies_select" on public.supplies;
create policy "supplies_select" on public.supplies
  for select using (public.is_authenticated_admin_or_mentor());

drop policy if exists "supplies_write" on public.supplies;
create policy "supplies_write" on public.supplies
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- supply_logs: 관리자만 조회·수정
drop policy if exists "supply_logs_select" on public.supply_logs;
create policy "supply_logs_select" on public.supply_logs
  for select using (public.is_authenticated_admin());

drop policy if exists "supply_logs_write" on public.supply_logs;
create policy "supply_logs_write" on public.supply_logs
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
