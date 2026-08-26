-- 행사 예산(예상 예산)과 별개로 최종 확정된 예산을 기록하기 위한 컬럼 추가.
alter table public.events
  add column if not exists final_budget integer;
