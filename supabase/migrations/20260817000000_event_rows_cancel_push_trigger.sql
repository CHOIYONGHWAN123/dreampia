-- event_rows.mentor_id가 값이 있던 상태에서 null로 바뀌면(관리자의 "배정 취소" 버튼
-- `cancelAssignment` 직접 UPDATE, 또는 멘토 자기취소 RPC `cancel_event_row_assignment`
-- 둘 다 결국 이 UPDATE로 귀결됨) send-assignment-cancel-push Edge Function을 호출해
-- 취소된 멘토에게 푸시 알림을 보낸다.
--
-- invitation_mentors insert 트리거(20260816040000)와 동일한 이유로 DB 트리거를 훅 지점으로
-- 삼는다: 두 취소 경로를 애플리케이션 코드에서 각각 따로 훅을 걸면 하나를 놓치기 쉽다.
create or replace function public.notify_assignment_cancelled_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.mentor_id is not null and new.mentor_id is null then
    perform net.http_post(
      url := 'https://ftgvbgqgvaajpxverlhj.supabase.co/functions/v1/send-assignment-cancel-push',
      body := jsonb_build_object(
        'event_row_id', new.id,
        'mentor_id', old.mentor_id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_L9hx2yRabpTNCUZmN2GLZA_A9zO8jvR'
      )
    );
  end if;
  return new;
end;
$$;

create trigger event_rows_notify_assignment_cancelled
  after update on public.event_rows
  for each row execute function public.notify_assignment_cancelled_push();
