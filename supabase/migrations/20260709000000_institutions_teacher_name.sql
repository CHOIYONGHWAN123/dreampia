-- institutions 테이블에 teacher_name 컬럼 누락 보정
-- (ERD/types에는 있었으나 실제 테이블 생성 시 누락되어 있었음)

alter table public.institutions
  add column if not exists teacher_name varchar;

comment on column public.institutions.teacher_name is '담당 선생님 성함 예: 3학년 부장 홍길동';
