-- event_rows에 준비 여부(preparing) 컬럼 추가

alter table public.event_rows
  add column if not exists preparing boolean not null default false;
