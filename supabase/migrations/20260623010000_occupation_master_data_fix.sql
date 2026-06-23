-- 20260623000000 마이그레이션 적용 당시 occupation_programs/program_categories/
-- mentor_occupation_programs가 이미 예전 스키마로 존재하고 있어서, CREATE TABLE IF NOT EXISTS가
-- 무시되고 일부 컬럼만 추가되는 어중간한 상태가 됐다. 기존 데이터는 테스트성 데이터로 확인되어
-- 전부 비우고 claude.md ERD에 맞는 스키마로 정리한다.

truncate table
  public.mentor_occupation_programs,
  public.lesson_plans,
  public.occupation_program_unit,
  public.occupation_programs,
  public.occupations,
  public.fields,
  public.program_categories
cascade;

-- ── program_categories: 예전 name 컬럼 제거, experience_type 추가 ──

alter table public.program_categories drop column if exists name;
alter table public.program_categories add column if not exists experience_type experience_type;
alter table public.program_categories alter column experience_type set not null;

-- ── occupation_programs: 유닛 레벨 필드를 occupation_program_unit으로 분리,
--    occupation_programs는 id/occupation_id/name만 남김 ──

alter table public.occupation_programs drop column if exists title;
alter table public.occupation_programs drop column if exists material_cost_per_person;
alter table public.occupation_programs drop column if exists prep_by;
alter table public.occupation_programs drop column if exists school_request_note;
alter table public.occupation_programs drop column if exists final_product_available;
alter table public.occupation_programs drop column if exists description;
alter table public.occupation_programs drop column if exists is_delivery_available;
alter table public.occupation_programs drop column if exists program_category_id;
alter table public.occupation_programs drop column if exists school_level;
alter table public.occupation_programs drop column if exists created_at;

-- ── mentor_occupation_programs: 예전 occupation_program_id 컬럼 제거 ──

alter table public.mentor_occupation_programs drop column if exists occupation_program_id;
