-- 행사 등록 시 프로그램(occupation_program_unit)만 먼저 추가하고
-- 시작/종료시간·날짜는 추후 입력할 수 있도록 NOT NULL 제약 해제

alter table public.event_rows
  alter column start_time drop not null,
  alter column end_time drop not null,
  alter column event_date drop not null;
