-- 프로그램 관리(/programs) 테스트용 더미데이터
-- experience_type enum에 유치원 항목이 없어 유치원 교급 카테고리는 만들지 않음 (ERD 공백)

-- ── program_categories 시드 (이 테이블은 /programs UI에 CRUD가 없어 SQL로 직접 넣음) ──

insert into public.program_categories (school_level, experience_type, sort_order)
select v.school_level, v.experience_type, v.sort_order
from (values
  ('초등'::school_level, '초등 직업체험'::experience_type, 1),
  ('초등'::school_level, '초등 문화예술체험'::experience_type, 2),
  ('중고등'::school_level, '중/고등 직업체험'::experience_type, 3),
  ('중고등'::school_level, '중/고등 문화예술체험'::experience_type, 4)
) as v(school_level, experience_type, sort_order)
where not exists (
  select 1 from public.program_categories pc
  where pc.school_level = v.school_level and pc.experience_type = v.experience_type
);

-- ── 분야 ──

insert into public.fields (name)
select v.name from (values ('요리'), ('마술'), ('공예')) as v(name)
where not exists (select 1 from public.fields f where f.name = v.name);

-- ── 직종 ──

insert into public.occupations (name, field_id)
select v.name, f.id
from (values
  ('아동요리전문가', '요리'),
  ('디저트전문가', '요리'),
  ('마술사', '마술'),
  ('비누공예전문가', '공예')
) as v(name, field_name)
join public.fields f on f.name = v.field_name
where not exists (select 1 from public.occupations o where o.name = v.name and o.field_id = f.id);

-- ── 직업 프로그램 ──

insert into public.occupation_programs (name, occupation_id)
select v.name, o.id
from (values
  ('마카롱 만들기', '아동요리전문가'),
  ('수제버거 만들기', '아동요리전문가'),
  ('쿠키 만들기', '디저트전문가'),
  ('마술쇼 체험', '마술사'),
  ('비누꽃 만들기', '비누공예전문가')
) as v(name, occupation_name)
join public.occupations o on o.name = v.occupation_name
where not exists (
  select 1 from public.occupation_programs p where p.name = v.name and p.occupation_id = o.id
);

-- ── 프로그램 유닛 ──

insert into public.occupation_program_unit (
  occupation_programs_id, title, material_cost_per_person, prep_by,
  final_product_available, is_delivery_available, program_category_id
)
select p.id, v.title, v.cost, v.prep_by::prep_by, v.final_product, v.delivery, pc.id
from (values
  ('마카롱 만들기', '마카롱 만들기 (초등)', 8000, '드림피아', true, true, '초등'::school_level, '초등 직업체험'::experience_type),
  ('마카롱 만들기', '마카롱 만들기 (중고등)', 9000, '드림피아', true, true, '중고등'::school_level, '중/고등 직업체험'::experience_type),
  ('수제버거 만들기', '수제버거 만들기', 7000, '강사', true, false, '초등'::school_level, '초등 문화예술체험'::experience_type),
  ('쿠키 만들기', '쿠키 만들기', 6000, '모두가능', true, true, '초등'::school_level, '초등 직업체험'::experience_type),
  ('마술쇼 체험', '마술쇼 체험 (초등)', 0, '강사', false, false, '초등'::school_level, '초등 문화예술체험'::experience_type),
  ('마술쇼 체험', '마술쇼 체험 (중고등)', 0, '강사', false, false, '중고등'::school_level, '중/고등 문화예술체험'::experience_type),
  ('비누꽃 만들기', '비누꽃 만들기', 10000, '드림피아', true, true, '중고등'::school_level, '중/고등 직업체험'::experience_type)
) as v(program_name, title, cost, prep_by, final_product, delivery, school_level, experience_type)
join public.occupation_programs p on p.name = v.program_name
join public.program_categories pc
  on pc.school_level = v.school_level and pc.experience_type = v.experience_type
where not exists (
  select 1 from public.occupation_program_unit u
  where u.occupation_programs_id = p.id and u.title = v.title
);
