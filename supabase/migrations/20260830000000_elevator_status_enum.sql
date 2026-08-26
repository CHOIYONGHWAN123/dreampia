-- 엘리베이터 유무를 boolean(있음/없음)에서 "있음/없음/확인필요" 3단계 enum으로 전환한다.
-- 클라이언트 요청: 아직 확인되지 않은 경우를 위한 "확인필요" 상태가 필요.
-- institutions/events 모두 동일하게 전환하여 EventForm의 기관→행사 자동채움 로직이
-- boolean/enum 변환 없이 그대로 값을 넘길 수 있도록 한다.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'elevator_status') then
    create type public.elevator_status as enum ('있음', '없음', '확인필요');
  end if;
end $$;

-- 기존값 매핑: true→있음, false→없음, null(미확인)→확인필요
alter table public.institutions
  alter column has_elevator type public.elevator_status
    using (
      case has_elevator
        when true then '있음'
        when false then '없음'
        else '확인필요'
      end
    )::public.elevator_status;

alter table public.institutions
  alter column has_elevator set default '확인필요';

alter table public.institutions
  alter column has_elevator set not null;

alter table public.events
  alter column has_elevator type public.elevator_status
    using (
      case has_elevator
        when true then '있음'
        when false then '없음'
        else '확인필요'
      end
    )::public.elevator_status;

alter table public.events
  alter column has_elevator set default '확인필요';

alter table public.events
  alter column has_elevator set not null;
