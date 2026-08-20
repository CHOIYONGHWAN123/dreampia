-- 강의 시작 전 "준비중"/"출석" 체크 알림.
--
-- 초대/배정취소 알림과 달리 특정 이벤트(insert/update)가 아니라 시간 경과로 발동해야 하므로
-- pg_cron으로 주기적으로 훑는다(expire_stale_invitations와 동일 패턴, 다만 20분 전 출석
-- 알림은 오차가 크면 안 되므로 5분 간격으로 더 촘촘하게 돈다).
--
-- 이미 보낸 강의는 다시 안 보내도록 sent_at 컬럼으로 표시해둔다. UPDATE ... RETURNING으로
-- "발송 대상 확정 + 표시"를 한 문장에서 원자적으로 처리해, cron이 겹쳐 돌아도 중복 발송되지 않는다.

alter table public.event_rows
  add column if not exists preparing_reminder_sent_at timestamptz,
  add column if not exists attendance_reminder_sent_at timestamptz;

create or replace function public.send_lecture_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- 준비중 알림: 강의 시작 4시간 이내, 아직 준비중 체크 안 함, 강사 배정됨
  for r in
    update public.event_rows
    set preparing_reminder_sent_at = now()
    where mentor_id is not null
      and preparing = false
      and preparing_reminder_sent_at is null
      and start_time <= now() + interval '4 hours'
      and start_time > now()
    returning id, mentor_id
  loop
    perform net.http_post(
      url := 'https://ftgvbgqgvaajpxverlhj.supabase.co/functions/v1/send-lecture-reminder-push',
      body := jsonb_build_object('type', 'preparing', 'event_row_id', r.id, 'mentor_id', r.mentor_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_L9hx2yRabpTNCUZmN2GLZA_A9zO8jvR'
      )
    );
  end loop;

  -- 출석 알림: 강의 시작 20분 이내, 아직 출석 체크 안 함, 강사 배정됨
  for r in
    update public.event_rows
    set attendance_reminder_sent_at = now()
    where mentor_id is not null
      and attendance = false
      and attendance_reminder_sent_at is null
      and start_time <= now() + interval '20 minutes'
      and start_time > now()
    returning id, mentor_id
  loop
    perform net.http_post(
      url := 'https://ftgvbgqgvaajpxverlhj.supabase.co/functions/v1/send-lecture-reminder-push',
      body := jsonb_build_object('type', 'attendance', 'event_row_id', r.id, 'mentor_id', r.mentor_id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_L9hx2yRabpTNCUZmN2GLZA_A9zO8jvR'
      )
    );
  end loop;
end;
$$;

select cron.schedule(
  'send_lecture_reminders',
  '*/5 * * * *',
  $$select public.send_lecture_reminders()$$
);
