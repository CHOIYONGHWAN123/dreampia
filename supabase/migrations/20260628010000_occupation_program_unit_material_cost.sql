-- occupation_program_unit의 1인당 재료비를 강사/드림피아 부담분으로 분리

alter table public.occupation_program_unit
  rename column material_cost_per_person to mentor_material_cost;

alter table public.occupation_program_unit
  add column if not exists dreampia_material_cost integer;
