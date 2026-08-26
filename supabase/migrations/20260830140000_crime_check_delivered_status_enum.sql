-- 회보서 전달여부를 boolean(완료/예정)에서 "완료/예정/시설출력" 3단계 enum으로 전환한다.
-- "시설출력"은 회보서를 드림피아가 전달하지 않고 기관(학교 등) 시설에서 직접 출력하는 경우를 뜻한다.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'crime_check_delivered_status') then
    create type public.crime_check_delivered_status as enum ('완료', '예정', '시설출력');
  end if;
end $$;

-- 기존값 매핑: true→완료, false→예정
alter table public.events
  alter column crime_check_delivered drop default;

alter table public.events
  alter column crime_check_delivered type public.crime_check_delivered_status
    using (
      case crime_check_delivered
        when true then '완료'
        else '예정'
      end
    )::public.crime_check_delivered_status;

alter table public.events
  alter column crime_check_delivered set default '예정';

alter table public.events
  alter column crime_check_delivered set not null;
