-- experience_type enum이 school_level과 의미가 중복되어 있던 문제 수정.
-- ('초등 직업체험' = school_level('초등') + experience_type('직업체험')의 조합이었음)
-- claude.md ERD대로 experience_type을 직업체험/문화예술체험 두 값으로 단순화한다.

create type experience_type_new as enum ('직업체험', '문화예술체험');

alter table public.program_categories
  alter column experience_type type experience_type_new
  using (
    case
      when experience_type::text in ('초등 직업체험', '중/고등 직업체험') then '직업체험'
      when experience_type::text in ('초등 문화예술체험', '중/고등 문화예술체험') then '문화예술체험'
    end
  )::experience_type_new;

drop type public.experience_type;
alter type public.experience_type_new rename to experience_type;
