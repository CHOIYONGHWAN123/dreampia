-- institution_type enum에 특수학교, 문화센터 추가
alter type public.institution_type add value if not exists '특수학교';
alter type public.institution_type add value if not exists '문화센터';

-- 기존 category 값을 institution_type으로 마이그레이션 (null이 아닌 경우)
update public.institutions
set institution_type = category::public.institution_type
where category is not null
  and institution_type is null
  and category in ('유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터');

-- category 컬럼 제거
alter table public.institutions drop column if exists category;
