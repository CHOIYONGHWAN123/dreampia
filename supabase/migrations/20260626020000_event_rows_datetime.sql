-- event_rows.start_time/end_time을 time(시각만)에서 timestamp(날짜+시각)로 변경
-- 날짜를 start_time/end_time에 포함시키므로 중복되는 event_date 컬럼은 제거
-- 기존 행은 event_date가 있으면 그 날짜를, 없으면 연결된 events.event_start_at의 날짜를 사용해 시각과 합쳐 보존

alter table public.event_rows
  add column start_time_new timestamp,
  add column end_time_new timestamp;

update public.event_rows er
set
  start_time_new = coalesce(er.event_date, e.event_start_at::date) + er.start_time,
  end_time_new = coalesce(er.event_date, e.event_start_at::date) + er.end_time
from public.events e
where e.id = er.event_id;

alter table public.event_rows drop column start_time;
alter table public.event_rows drop column end_time;
alter table public.event_rows drop column event_date;
alter table public.event_rows rename column start_time_new to start_time;
alter table public.event_rows rename column end_time_new to end_time;
