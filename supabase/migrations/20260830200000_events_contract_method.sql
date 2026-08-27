-- 계약방식(단일계약/공동계약) — 기존 계약현황(contract_status)의 "진행중(단일계약)" /
-- "진행중(공동계약)" 표기와는 별개의 독립된 필드로 신설한다(행사운영확인표 검토 결과).
-- A(행사 단위) 필드라 events에 둔다.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'contract_method') then
    create type public.contract_method as enum ('단일계약', '공동계약');
  end if;
end $$;

alter table public.events
  add column if not exists contract_method public.contract_method;
