-- 행사운영확인표 3단계 데이터 분리 (행사 단위 A / 그룹 단위 B / 날짜 단위 C).
--
-- 지금까지 준비물·계약전달여부·행사안내 같은 값이 전부 events 컬럼(행사당 값 1개)이라,
-- 행사운영확인표에서 행사 하나를 실제 수업일 수만큼 여러 줄로 쪼개 보여줘도 어느 줄에서
-- 고치든 같은 값을 덮어써서 다른 날짜 줄까지 같이 바뀌는 문제가 있었다.
--
-- 클라이언트와 협의해 필드를 세 단위로 나눴다:
--   A(행사 단위) — 지금처럼 events에 유지, 이 마이그레이션에서 손대지 않음.
--   B(그룹 단위) — 평소엔 날짜별 독립, 행사 등록 시 특정 "날짜"들을 그룹으로 묶으면
--                  그 그룹 안에서만 값이 공유됨. event_dates(기본값) + event_groups(그룹 지정 시).
--   C(날짜 단위) — 항상 날짜마다 독립. event_dates로 이동.
--
-- 그룹 지정은 "날짜" 단위다 — 하루에 프로그램(event_rows)이 여러 개 있어도 그룹에는 그
-- 날짜의 프로그램 전체가 통째로 들어가거나 아예 안 들어간다(부분 선택 없음). 그래서 그룹
-- 소속 여부는 프로그램/event_row가 아니라 event_dates(행사+날짜) 단위로만 관리하면 된다.

create table public.event_groups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       varchar not null,
  -- B(그룹 단위) 필드 — 이 그룹에 속한 날짜들이 공유하는 값
  pre_notice_sent boolean not null default false,
  institution_request_delivered boolean,
  crime_check_notified boolean,
  crime_check_delivered public.crime_check_delivered_status,
  photo_sent boolean,
  contract_status public.contract_status,
  created_at timestamp not null default now()
);

create table public.event_dates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  date       date not null,
  group_id   uuid references public.event_groups(id) on delete set null,
  -- C(날짜 단위) 필드
  field_admin_ids uuid[],
  event_check_status smallint not null default 1,
  supplies_status public.supplies_status,
  supplies_admin_id uuid references public.admins(id),
  group_chat_status varchar,
  remarks text,
  -- B(그룹 단위) 필드의 기본값 — group_id가 null이면(=그룹 미지정) 이 값을 그대로 쓰고,
  -- group_id가 있으면 event_groups 쪽 값을 대신 쓴다.
  pre_notice_sent boolean not null default false,
  institution_request_delivered boolean,
  crime_check_notified boolean,
  crime_check_delivered public.crime_check_delivered_status,
  photo_sent boolean,
  contract_status public.contract_status,
  unique (event_id, date)
);

create index event_dates_event_id_idx on public.event_dates(event_id);
create index event_dates_group_id_idx on public.event_dates(group_id);
create index event_groups_event_id_idx on public.event_groups(event_id);

alter table public.event_groups enable row level security;
alter table public.event_dates enable row level security;

-- 행사운영확인표는 관리자 전용 화면이라 work_logs와 동일한 패턴(관리자만 전체 접근)을 쓴다.
create policy "event_groups_admin_all" on public.event_groups
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
create policy "event_dates_admin_all" on public.event_dates
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- 백필: 기존 행사 × 실제 수업일(event_rows.start_time 기준) 조합마다 event_dates 행을
-- 만들고 지금 events에 있는 값을 그대로 복사해 넣는다. 전부 미그룹 상태로 시작하므로
-- 지금까지와 동일하게 보이다가, 이후 관리자가 그룹으로 묶으면 그때부터 날짜별로 갈라진다.
insert into public.event_dates (
  event_id, date,
  field_admin_ids, event_check_status, supplies_status, supplies_admin_id, group_chat_status, remarks,
  pre_notice_sent, institution_request_delivered, crime_check_notified, crime_check_delivered, photo_sent, contract_status
)
select distinct
  e.id, (er.start_time)::date,
  e.field_admin_ids, e.event_check_status, e.supplies_status, e.supplies_admin_id, e.group_chat_status, e.remarks,
  e.pre_notice_sent, e.institution_request_delivered, e.crime_check_notified, e.crime_check_delivered, e.photo_sent, e.contract_status
from public.events e
join public.event_rows er on er.event_id = e.id
where er.start_time is not null
on conflict (event_id, date) do nothing;
