-- event_rows_sync_recruit_status 트리거가 지금까지 "after update of mentor_id"에만 걸려있어서,
-- 이미 "섭외완료"인 행사에 새 프로그램(일정)을 추가하면(INSERT) recruit_status가 갱신되지
-- 않고 "섭외완료"로 잘못 남아있는 문제가 있었다. 같은 이유로 일정을 삭제(DELETE)해도
-- 갱신되지 않는다. INSERT/DELETE까지 트리거 대상에 포함시키고, DELETE는 NEW가 없으므로
-- TG_OP로 분기해 OLD.event_id를 쓰도록 함수를 손본다.
--
-- 행(row)이 하나도 없는 이벤트는 bool_and()가 NULL을 반환하므로 coalesce로 false 처리해
-- "전부 배정 완료"로 잘못 판정되지 않게 한다(빈 행사가 섭외완료로 표시되는 일을 방지).

create or replace function public.sync_event_recruit_status_on_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_all_assigned boolean;
  v_current_status public.events.recruit_status%TYPE;
begin
  v_event_id := case when tg_op = 'DELETE' then old.event_id else new.event_id end;

  select coalesce(bool_and(mentor_id is not null), false) into v_all_assigned
  from public.event_rows
  where event_id = v_event_id;

  select recruit_status into v_current_status from public.events where id = v_event_id;

  if v_all_assigned and v_current_status is distinct from '섭외완료' then
    update public.events set recruit_status = '섭외완료' where id = v_event_id;
  elsif not v_all_assigned and v_current_status = '섭외완료' then
    update public.events set recruit_status = '섭외진행중' where id = v_event_id;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists event_rows_sync_recruit_status on public.event_rows;
create trigger event_rows_sync_recruit_status
  after insert or delete or update of mentor_id on public.event_rows
  for each row
  execute function public.sync_event_recruit_status_on_assignment();

-- 이미 어긋난 기존 데이터 보정: 배정 안 된 일정이 하나라도 있는데 "섭외완료"로
-- 남아있는 행사(새 프로그램 추가 버그로 인해 발생했을 가능성이 높은 케이스)를 바로잡는다.
update public.events e
set recruit_status = '섭외진행중'
where recruit_status = '섭외완료'
  and exists (
    select 1 from public.event_rows er where er.event_id = e.id and er.mentor_id is null
  );
