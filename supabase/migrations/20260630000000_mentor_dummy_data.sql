-- 강사 관리(/mentors) 테스트용 더미데이터
-- 개인 강사 4명, 소속대표 2명, 소속강사(대표 산하) 3명 + 일부에 프로그램 배정

-- ── 개인 / 소속대표 강사 (belongs_to 없음) ──

insert into public.mentors (
  name, phone, address, detail_address, id_number, bank_account,
  available_areas, is_available, is_authenticated, score, terms_agreed_at
)
select
  v.name, v.phone, v.address, v.detail_address, v.id_number, v.bank_account,
  v.available_areas, v.is_available, v.is_authenticated, v.score,
  case when v.is_authenticated then now() else null end
from (values
  ('김민준', '010-1234-5601', '부산광역시 해운대구 센텀중앙로 90', '101동 1001호', '900101-1234567', '국민은행 123456-12-345601', ARRAY['부산','김해'], true,  true,  85),
  ('이서연', '010-1234-5602', '울산광역시 남구 삼산로 50',         '202동 502호',  '920512-2345678', '신한은행 110-234-567802',   ARRAY['울산'],        true,  false, 70),
  ('강도윤', '010-1234-5603', '경상남도 김해시 분성로 12',         null,           '950815-1456789', '농협 301-1234-5603',       ARRAY['김해'],        true,  false, 55),
  ('윤서아', '010-1234-5604', '부산광역시 동래구 충렬대로 30',     null,           '980222-2345671', '카카오뱅크 3333-04-1234567', ARRAY['부산','울산'], false, false, 40),
  ('박지훈', '010-1234-5605', '경상남도 창원시 의창구 중앙대로 100','15층',        '880307-1234567', '국민은행 123456-12-345605', ARRAY['창원','부산'], true,  true,  92),
  ('임하준', '010-1234-5606', '경상남도 창원시 성산구 창이대로 71', '3층',         '870423-1234567', '우리은행 1002-345-606060',  ARRAY['창원'],        true,  true,  88)
) as v(name, phone, address, detail_address, id_number, bank_account, available_areas, is_available, is_authenticated, score)
where not exists (select 1 from public.mentors m where m.name = v.name);

-- ── 소속강사 (위 소속대표 산하) ──

insert into public.mentors (
  name, phone, address, detail_address, id_number, bank_account,
  belongs_to, available_areas, is_available, is_authenticated, score, terms_agreed_at
)
select
  v.name, v.phone, v.address, v.detail_address, v.id_number, v.bank_account,
  owner.id, v.available_areas, v.is_available, v.is_authenticated, v.score,
  case when v.is_authenticated then now() else null end
from (values
  ('최유진', '010-1234-5607', '부산광역시 해운대구 마린시티로 15', null, '930615-2345678', '국민은행 123456-12-345607', '박지훈', ARRAY['부산'],        true,  true, 80),
  ('정하은', '010-1234-5608', '부산광역시 수영구 광안해변로 8',   null, '960930-2456789', '신한은행 110-345-678908',   '박지훈', ARRAY['부산','창원'], false, true, 60),
  ('한지우', '010-1234-5609', '경상남도 창원시 의창구 도계로 20',  null, '940110-1345671', '농협 301-2345-6609',       '임하준', ARRAY['창원'],        true,  true, 75)
) as v(name, phone, address, detail_address, id_number, bank_account, owner_name, available_areas, is_available, is_authenticated, score)
join public.mentors owner on owner.name = v.owner_name
where not exists (select 1 from public.mentors m where m.name = v.name);

-- ── 프로그램 배정 (program_dummy_data 마이그레이션의 기존 유닛에 연결) ──

insert into public.mentor_occupation_programs (
  mentor_id, occupation_program_unit_id, lecture_fee_payer_id, material_fee_payer_id
)
select m.id, u.id, payer.id, payer.id
from (values
  ('김민준', '마카롱 만들기 (초등)',   '김민준'),
  ('이서연', '수제버거 만들기',        '이서연'),
  ('강도윤', '쿠키 만들기',            '강도윤'),
  ('박지훈', '마카롱 만들기 (중고등)', '박지훈'),
  ('최유진', '비누꽃 만들기',          '박지훈'),
  ('정하은', '쿠키 만들기',            '박지훈'),
  ('임하준', '마술쇼 체험 (중고등)',   '임하준'),
  ('한지우', '마술쇼 체험 (초등)',     '임하준')
) as v(mentor_name, unit_title, payer_name)
join public.mentors m on m.name = v.mentor_name
join public.occupation_program_unit u on u.title = v.unit_title
join public.mentors payer on payer.name = v.payer_name
where not exists (
  select 1 from public.mentor_occupation_programs mop
  where mop.mentor_id = m.id and mop.occupation_program_unit_id = u.id
);
