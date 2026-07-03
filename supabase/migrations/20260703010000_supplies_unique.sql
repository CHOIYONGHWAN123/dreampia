-- occupation_program_unit 1개당 supplies 행 1개 보장
alter table public.supplies
  add constraint supplies_unit_unique unique (occupation_program_unit_id);
