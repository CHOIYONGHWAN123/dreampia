-- 행사운영확인표(event-operations) 컬럼 개편 요청에 따라, 대응하는 필드가 아직 없던
-- 항목들을 events 테이블에 추가한다. 기존 contract_delivered/admin_docs_delivered 등과
-- 동일한 명명 패턴을 따른다.
alter table public.events
  add column contract_memo text,
  add column estimate_delivered boolean not null default false,
  add column crime_check_delivered boolean not null default false;

-- events는 이미 테이블 단위 RLS 정책이 적용되어 있어 컬럼 추가만으로는 정책 변경이 필요 없다.
