-- 계약현황 "계약 시작 전"을 전화 진행 여부에 따라
-- "계약 시작 전(전화 예정)" / "계약 시작 전(전화 완료)" 두 단계로 세분화한다.
-- postgres enum은 값을 직접 삭제할 수 없어 타입을 새로 만들어 교체하는 방식으로 처리한다.

alter type public.contract_status rename to contract_status_old;

create type public.contract_status as enum (
  '계약 시작 전(전화 예정)', '계약 시작 전(전화 완료)', '진행중(단일계약)', '진행중(공동계약)',
  '최종일 계약', '계약 완료', '계약 없음'
);

-- 기존값 매핑: 계약 시작 전→계약 시작 전(전화 예정) (전화 진행 여부가 아직 확인되지 않았으므로 보수적으로 매핑)
alter table public.events
  alter column contract_status type public.contract_status
    using (
      case contract_status::text
        when '계약 시작 전' then '계약 시작 전(전화 예정)'
        else contract_status::text
      end
    )::public.contract_status;

drop type public.contract_status_old;
