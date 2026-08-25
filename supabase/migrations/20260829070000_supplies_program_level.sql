-- 재고(supplies)를 프로그램 유닛(occupation_program_unit) 단위에서
-- 프로그램(occupation_programs) 단위로 전환한다. 같은 프로그램이 교급별로 유닛이
-- 여러 개 나뉘어 있어도(예: 초등/중고등) 실제로는 같은 재료를 쓰므로, 그 프로그램에
-- 속한 모든 유닛이 강의를 나갈 때마다 하나의 재고 풀을 함께 소진하도록 한다.
-- 현재 supplies/supply_logs 모두 0건이라 백필 없이 컬럼만 교체한다.

alter table public.supplies
  add column occupation_programs_id uuid references public.occupation_programs(id) on delete set null;

alter table public.supplies
  drop column occupation_program_unit_id;
