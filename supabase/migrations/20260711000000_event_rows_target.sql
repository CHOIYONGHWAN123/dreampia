-- event_rows에 대상(학년) 컬럼 추가

alter table public.event_rows
  add column if not exists target varchar;

comment on column public.event_rows.target is '대상 예 : 1학년, 2학년, 3학년';
