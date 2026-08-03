-- "계약 전달 대기/완료" 상태를 위한 컬럼.
-- 요청됐던 나머지 8개 상태는 이미 events 테이블에 다른 이름으로 존재해서
-- (recruit_status, recruit_delivered, school_request_delivered, admin_docs_delivered,
--  pre_notice_sent, photo_sent, report_sent, supplies_status/estimate_file_url) 중복
-- 생성하지 않는다. 기존 _delivered 네이밍 컨벤션(recruit_delivered 등)을 따른다.

alter table public.events
  add column contract_delivered boolean not null default false;
