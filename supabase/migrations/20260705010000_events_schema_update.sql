-- ── 신규 enum 정의 ────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'contract_type') then
    create type public.contract_type as enum (
      '학교장터', '수의계약', 'MyDesk', '페이백', '나라장터'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'supplies_status') then
    create type public.supplies_status as enum (
      '준비 완료', '체크 전', '재고 이상무', '재고 파악',
      '주문 필요', '택배 예정', '택배 발송', '회수 필요'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'crime_check_status') then
    create type public.crime_check_status as enum (
      '불필요', '진행전', '취합중', '완료'
    );
  end if;
end $$;

-- ── events 신규 컬럼 추가 ─────────────────────────────────────────────

alter table public.events
  add column if not exists field_admin_id uuid references public.admins(id) on delete set null,
  add column if not exists group_chat_link varchar;

-- ── 기존 varchar 컬럼 → enum 타입으로 변경 ───────────────────────────
-- 개발 데이터이므로 기존값은 null 처리

alter table public.events
  alter column contract_type type public.contract_type
    using null::public.contract_type;

alter table public.events
  alter column supplies_status type public.supplies_status
    using null::public.supplies_status;

alter table public.events
  alter column crime_check_status type public.crime_check_status
    using null::public.crime_check_status;
