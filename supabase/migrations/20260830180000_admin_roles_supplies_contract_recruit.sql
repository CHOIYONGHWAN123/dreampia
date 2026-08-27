-- 영업담당(is_sales)/소통담당(is_comm)과 같은 방식으로 준비물 담당·계약 담당·강사(섭외) 담당
-- 역할을 추가한다. 이름은 events 테이블의 대응 상태 컬럼(supplies_status/contract_status/
-- recruit_status)과 맞춘다.
alter table public.admins
  add column is_supplies boolean not null default false,
  add column is_contract boolean not null default false,
  add column is_recruit boolean not null default false;

-- events에는 영업담당자(sales_admin_id)/소통담당자(comm_admin_id)와 동일한 단일 FK 방식으로
-- 담당자를 배정한다.
alter table public.events
  add column supplies_admin_id uuid references public.admins(id),
  add column contract_admin_id uuid references public.admins(id),
  add column recruit_admin_id uuid references public.admins(id);

-- admins/events는 이미 테이블 단위 RLS 정책이 적용되어 있어 컬럼 추가만으로는 정책 변경이 필요 없다.
