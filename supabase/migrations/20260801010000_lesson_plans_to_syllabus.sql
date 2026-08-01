-- lesson_plans 테이블 제거, 강의계획서 파일을 occupation_program_unit에서 직접 관리.
--
-- lesson_plans는 (occupation_program_id, grade, event_category_id) 조합별로
-- 강의계획서를 따로 두도록 설계됐지만 실제로는 0건, 참조 코드도 없는 미구현 테이블이었다.
-- occupation_program_unit이 이미 school_level 단위로 프로그램을 나누고 있으므로
-- 강의계획서도 유닛 단위(school_level granularity)로 단순화한다.
-- 파일은 기존 lesson-plans 스토리지 버킷(비어있음)을 그대로 재사용한다.

alter table public.occupation_program_unit
  add column syllabus varchar;

drop table public.lesson_plans;

drop type public.grade;
