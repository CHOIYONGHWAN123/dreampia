-- event_rows 테이블을 CLAUDE.md ERD 기준으로 정리
-- occupation_program_id 대신 occupation_program_unit_id로 연결하고,
-- 더 이상 쓰지 않는 event_schedule_id / target_grade / material_fee 컬럼 제거

alter table public.event_rows
  add column if not exists occupation_program_unit_id uuid references public.occupation_program_unit (id);

alter table public.event_rows
  drop column if exists event_schedule_id,
  drop column if exists occupation_program_id,
  drop column if exists target_grade,
  drop column if exists material_fee;
