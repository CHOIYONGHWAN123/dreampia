-- supply_logs의 event_id를 event_row_id로 교체
-- event_row_id가 있으면 event_rows → events → institutions / campaign 등 상세 정보 조회 가능

alter table public.supply_logs
  drop column if exists event_id,
  add column if not exists event_row_id uuid references public.event_rows(id) on delete set null;
