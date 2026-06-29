-- 직전 마이그레이션(mentor_dummy_data)에서 일부 강사가 같은 프로그램에 두 번 배정됨.
-- occupation_program_unit에 동일한 title이 중복 존재하는 행이 있어(요리/요식 분야에
-- "아동요리전문가" 직종이 중복 생성된 기존 이슈, 비누꽃 만들기는 단순 중복 입력)
-- title 기준 매칭이 두 유닛에 모두 걸려 한 강사가 두 행으로 들어갔다. 중복분만 제거한다.

delete from public.mentor_occupation_programs
where occupation_program_unit_id in (
  'b9169c07-5ea1-4ccd-bdad-3e54b6e14bb7', -- 마카롱 만들기 (초등) 중복 유닛 (김민준)
  'b72556f2-116a-4ee6-b0f0-a92cae910eaf', -- 마카롱 만들기 (중고등) 중복 유닛 (박지훈)
  '5e6c1efe-2fdc-45be-9b7a-d22717f0003d', -- 수제버거 만들기 중복 유닛 (이서연)
  'd825fb98-bc83-4d27-b4cc-31974525d05b'  -- 비누꽃 만들기 중복 유닛 (최유진)
);
