-- 견적서와 별개로 거래명세서 파일을 첨부할 수 있도록 컬럼 추가.
-- estimate_file_url과 동일하게 private 버킷('events') 경로만 저장하고,
-- 조회 시 signed URL로 변환한다.
alter table public.events
  add column if not exists transaction_statement_file_url varchar;
