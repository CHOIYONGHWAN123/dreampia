-- 준비주체(prep_by)는 지금까지 occupation_program_unit(프로그램) 단위 기본값만 있었다.
-- 행사 수정 화면에서 특정 행(event_row) 하나만 예외적으로 다른 준비주체로 바꾸고 싶은 경우가
-- 있어(예: 보통은 드림피아가 준비하지만 이 행사는 강사가 준비하기로 함), mentor_material_cost/
-- dreampia_material_cost와 동일한 패턴(행 값이 null이면 프로그램 기본값을 그대로 따르고,
-- 값이 있으면 이 행만의 수동 오버라이드)으로 event_rows에 prep_by 컬럼을 추가한다.
alter table public.event_rows add column if not exists prep_by prep_by;
