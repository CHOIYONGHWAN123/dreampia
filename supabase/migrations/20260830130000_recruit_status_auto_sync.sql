-- events.recruit_status("섭외현황")는 지금까지 관리자 앱의 assignMentorDirectly/
-- cancelAssignment(TS)에서만 동기화됐다. 강사가 강사 웹에서 초대를 직접 수락해
-- event_rows.mentor_id가 채워지는(가장 흔한) 경로는 전부 DB 함수
-- (accept_invitation_event_row/accept_invitation_all)에서 처리되는데, 이 함수들은
-- recruit_status를 전혀 건드리지 않아 모든 일정이 배정 완료돼도 "섭외완료"로
-- 자동 전환되지 않는 문제가 있었다.
--
-- event_rows.mentor_id가 바뀔 때마다(배정 경로와 무관하게) 항상 동기화되도록
-- 트리거로 옮긴다. 관리자 앱의 TS 쪽 동기화 로직은 이 트리거로 대체되어 제거한다
-- (두 곳에 같은 로직을 두면 나중에 한쪽만 고치는 이번과 같은 문제가 재발하기 쉽다).

create or replace function public.sync_event_recruit_status_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_assigned boolean;
  v_current_status public.events.recruit_status%TYPE;
begin
  select bool_and(mentor_id is not null) into v_all_assigned
  from public.event_rows
  where event_id = new.event_id;

  select recruit_status into v_current_status from public.events where id = new.event_id;

  if v_all_assigned and v_current_status is distinct from '섭외완료' then
    update public.events set recruit_status = '섭외완료' where id = new.event_id;
  elsif not v_all_assigned and v_current_status = '섭외완료' then
    update public.events set recruit_status = '섭외진행중' where id = new.event_id;
  end if;

  return new;
end;
$$;

drop trigger if exists event_rows_sync_recruit_status on public.event_rows;
create trigger event_rows_sync_recruit_status
  after update of mentor_id on public.event_rows
  for each row
  execute function public.sync_event_recruit_status_on_assignment();

-- 이미 어긋난 기존 데이터 보정: 일정이 1개 이상 있고 전부 배정 완료됐는데
-- 아직 "섭외완료"가 아닌 행사를 바로잡는다.
update public.events e
set recruit_status = '섭외완료'
where recruit_status <> '섭외완료'
  and exists (select 1 from public.event_rows er where er.event_id = e.id)
  and not exists (
    select 1 from public.event_rows er2 where er2.event_id = e.id and er2.mentor_id is null
  );
