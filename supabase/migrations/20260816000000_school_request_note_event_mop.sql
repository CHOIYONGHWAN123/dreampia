-- 학교요청사항: 행사 전체 단위, 강사×프로그램 단위로도 각각 기록 가능하도록 컬럼 추가
-- (기존 occupation_program_unit.school_request_note는 프로그램 유닛 단위 요청사항으로 유지)

alter table public.events
  add column school_request_note text;

alter table public.mentor_occupation_programs
  add column school_request_note text;
