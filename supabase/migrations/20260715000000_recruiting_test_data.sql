-- 강사 섭외(모든수락/부분수락) 테스트를 위한 프로그램 유닛 + 강사 더미데이터
-- 기존 제과제빵사(마카롱 만들기/피자 만들기)는 건드리지 않고, 다양한 분야/직종/멘토 등록
-- 조합을 추가해 부분수락(합집합)·모든수락(교집합) 필터링을 여러 케이스로 테스트할 수 있게 한다.

-- ── 분야 ──

insert into public.fields (name)
select v.name from (values ('뷰티'), ('디자인'), ('공예')) as v(name)
where not exists (select 1 from public.fields f where f.name = v.name);

-- ── 직종 ──

insert into public.occupations (name, field_id)
select v.name, f.id
from (values
  ('조향사', '뷰티'),
  ('시각디자이너', '디자인'),
  ('캘리그라퍼', '공예'),
  ('아동요리전문가', '요리'),
  ('파티쉐', '요리')
) as v(name, field_name)
join public.fields f on f.name = v.field_name
where not exists (select 1 from public.occupations o where o.name = v.name and o.field_id = f.id);

-- ── 직업 프로그램 ──

insert into public.occupation_programs (name, occupation_id)
select v.name, o.id
from (values
  ('액체 향수 만들기', '조향사'),
  ('오일파스텔화', '시각디자이너'),
  ('캘리그라피 키링', '캘리그라퍼'),
  ('마카롱&쿠키 클래스', '아동요리전문가'),
  ('화과자 만들기', '파티쉐')
) as v(name, occupation_name)
join public.occupations o on o.name = v.occupation_name
where not exists (
  select 1 from public.occupation_programs p where p.name = v.name and p.occupation_id = o.id
);

-- ── 프로그램 유닛 ──

insert into public.occupation_program_unit (
  occupation_programs_id, title, mentor_material_cost, dreampia_material_cost, prep_by,
  final_product_available, is_delivery_available, description, program_category_id
)
select p.id, v.title, v.mentor_cost, v.dreampia_cost, v.prep_by::prep_by, v.final_product, v.delivery, v.description, pc.id
from (values
  ('액체 향수 만들기',   '액체 향수 만들기',       5000, 0,    '강사',    true,  true,  '조향사의 직무를 체험하며 액체 향수를 조향해보는 프로그램입니다.', '초등'::school_level, '문화예술체험'::experience_type),
  ('오일파스텔화',       '오일파스텔화 그리기',     4000, 0,    '강사',    true,  false, '오일파스텔로 나만의 작품을 그려보는 시각디자인 체험 프로그램입니다.', '초등'::school_level, '문화예술체험'::experience_type),
  ('캘리그라피 키링',    '캘리키링 만들기',         3000, 0,    '드림피아', true,  true,  '캘리그라피로 나만의 키링을 만들어보는 공예 체험 프로그램입니다.', '초등'::school_level, '문화예술체험'::experience_type),
  ('마카롱&쿠키 클래스', '마카롱 만들기(아동요리)', 6000, 0,    '강사',    true,  true,  '아동요리전문가 직무 체험 - 마카롱 만들기', '초등'::school_level, '직업체험'::experience_type),
  ('마카롱&쿠키 클래스', '아이싱쿠키 만들기',       6000, 0,    '강사',    true,  true,  '아동요리전문가 직무 체험 - 아이싱쿠키 만들기', '초등'::school_level, '직업체험'::experience_type),
  ('화과자 만들기',      '화과자 만들기',           7000, 0,    '드림피아', true,  false, '파티쉐 직무 체험 - 화과자 만들기', '중고등'::school_level, '직업체험'::experience_type)
) as v(program_name, title, mentor_cost, dreampia_cost, prep_by, final_product, delivery, description, school_level, experience_type)
join public.occupation_programs p on p.name = v.program_name
join public.program_categories pc
  on pc.school_level = v.school_level and pc.experience_type = v.experience_type
where not exists (
  select 1 from public.occupation_program_unit u
  where u.occupation_programs_id = p.id and u.title = v.title
);

-- ── 강사 ──

insert into public.mentors (
  name, phone, address, id_number, bank_account,
  available_areas, is_available, is_authenticated, score, terms_agreed_at
)
select
  v.name, v.phone, v.address, v.id_number, v.bank_account,
  v.available_areas, v.is_available, v.is_authenticated, v.score,
  case when v.is_authenticated then now() else null end
from (values
  ('박향기', '010-2234-5601', '부산광역시 부산진구 중앙대로 100', '910101-1234567', '국민은행 123456-12-560101', ARRAY['부산'],        true,  true,  78),
  ('이도윤', '010-2234-5602', '울산광역시 중구 성남동 20',       '890512-1234567', '신한은행 110-234-560202',   ARRAY['울산','부산'], true,  true,  90),
  ('최민지', '010-2234-5603', '경상남도 김해시 김해대로 15',      '950815-2456789', '농협 301-1234-5603',       ARRAY['김해'],        true,  true,  82),
  ('한서준', '010-2234-5604', '경상남도 창원시 성산구 원이대로 30','870307-1234567', '카카오뱅크 3333-04-5604',  ARRAY['창원'],        true,  false, 65)
) as v(name, phone, address, id_number, bank_account, available_areas, is_available, is_authenticated, score)
where not exists (select 1 from public.mentors m where m.name = v.name);

insert into public.mentors (
  name, phone, address, id_number, bank_account,
  belongs_to, available_areas, is_available, is_authenticated, score, terms_agreed_at
)
select
  v.name, v.phone, v.address, v.id_number, v.bank_account,
  owner.id, v.available_areas, v.is_available, v.is_authenticated, v.score,
  case when v.is_authenticated then now() else null end
from (values
  ('김도담', '010-2234-5605', '울산광역시 남구 삼산로 10', '970310-2345671', '신한은행 110-234-560505', '이도윤', ARRAY['울산'], true, true, 70)
) as v(name, phone, address, id_number, bank_account, owner_name, available_areas, is_available, is_authenticated, score)
join public.mentors owner on owner.name = v.owner_name
where not exists (select 1 from public.mentors m where m.name = v.name);

-- ── 강사 ↔ 프로그램 유닛 등록 ──
-- 이도윤: 오일파스텔화 + 캘리키링 (서로 다른 직종 간 모든수락 테스트)
-- 최민지: 마카롱(아동요리) + 아이싱쿠키 (같은 직종 내 모든수락 테스트)
-- 김도담: 마카롱(아동요리)만 등록 (최민지와 부분 겹침 - 모든수락 후보에서는 제외되어야 함)
-- 박향기 / 한서준: 각 1개 유닛만 등록 (부분수락 단독 케이스)

insert into public.mentor_occupation_programs (
  mentor_id, occupation_program_unit_id, lecture_fee_payer_id, material_fee_payer_id
)
select m.id, u.id, m.id, m.id
from (values
  ('박향기', '액체 향수 만들기'),
  ('이도윤', '오일파스텔화 그리기'),
  ('이도윤', '캘리키링 만들기'),
  ('최민지', '마카롱 만들기(아동요리)'),
  ('최민지', '아이싱쿠키 만들기'),
  ('김도담', '마카롱 만들기(아동요리)'),
  ('한서준', '화과자 만들기')
) as v(mentor_name, unit_title)
join public.mentors m on m.name = v.mentor_name
join public.occupation_program_unit u on u.title = v.unit_title
where not exists (
  select 1 from public.mentor_occupation_programs mop
  where mop.mentor_id = m.id and mop.occupation_program_unit_id = u.id
);
